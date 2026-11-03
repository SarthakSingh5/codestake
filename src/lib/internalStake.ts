import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

// This file is NOT a Server Action (no "use server" at the top).
// These functions can only be imported and called securely by our own backend API routes.

export async function internalResolveStakeWin(sessionId: string) {
  const adminClient = createSupabaseAdminClient();

  // 1. Fetch the session
  const { data: session } = await adminClient
    .from("stake_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("status", "active")
    .single();

  if (!session) return;

  // 2. Update status to won
  await adminClient
    .from("stake_sessions")
    .update({ status: "won" })
    .eq("id", sessionId);

  // 3. No refund needed because we didn't take money upfront!
  // No transaction log needed for a win, because the stake_sessions table already tracks wins.
}

export async function internalFailStakeSession(sessionId: string) {
  const adminClient = createSupabaseAdminClient();

  const { data: session } = await adminClient
    .from("stake_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("status", "active")
    .single();

  if (!session) return;

  await adminClient
    .from("stake_sessions")
    .update({ status: "lost" })
    .eq("id", sessionId);

  const { error: debtError } = await adminClient.rpc('incur_debt', {
    p_user_id: session.user_id,
    p_amount: session.amount_cents
  });
  
  if (debtError) {
    console.error("FATAL: Failed to incur debt for user", session.user_id, debtError);
  }

  const { error: txError } = await adminClient.from("transactions").insert({
    user_id: session.user_id,
    amount_cents: -session.amount_cents,
    type: "stake_lost",
    reference_id: session.problem_id
  });

  if (txError) {
    console.error("FATAL: Failed to log transaction for user", session.user_id, txError);
  }
}

export async function internalSweepExpiredSessions(userId: string) {
  const adminClient = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // Find all active stake_sessions for this user whose expires_at is in the past
  const { data: expiredSessions, error } = await adminClient
    .from("stake_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", now);

  if (error) {
    console.error("Error sweeping expired sessions:", error);
    return;
  }

  if (expiredSessions && expiredSessions.length > 0) {
    for (const session of expiredSessions) {
      await internalFailStakeSession(session.id);

      const { data: w } = await adminClient
        .from('wallets')
        .select('persona_score')
        .eq('user_id', userId)
        .single();
      if (w) {
        await adminClient
          .from('wallets')
          .update({ persona_score: (w.persona_score || 0) - 10 })
          .eq('user_id', userId);
      }
    }
  }
}

export async function internalSweepExpiredContracts(userId: string) {
  const adminClient = createSupabaseAdminClient();

  const { data: contracts, error } = await adminClient
    .from('challenge_contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !contracts || contracts.length === 0) return [];

  const activeContracts = [];
  const now = new Date();

  for (const contract of contracts) {
    const expiresAt = new Date(contract.expires_at);
    const isQuotaMet = contract.mode === 'gauntlet'
      ? (contract.total_problems_solved || 0) >= contract.target_problems_per_day
      : (contract.problems_solved_today || 0) >= contract.target_problems_per_day;

    if (now > expiresAt) {
      if (!isQuotaMet) {
        // Failed quota: incur penalty
        await adminClient.rpc('incur_debt', {
          p_user_id: userId,
          p_amount: contract.penalty_cents
        });

        await adminClient
          .from('challenge_contracts')
          .update({ status: 'failed' })
          .eq('id', contract.id);

        const { data: walletData } = await adminClient
          .from('wallets')
          .select('persona_score')
          .eq('user_id', userId)
          .single();
        if (walletData) {
          await adminClient
            .from('wallets')
            .update({ persona_score: (walletData.persona_score || 0) - 10 })
            .eq('user_id', userId);
        }
      } else {
        // Met quota for the day or gauntlet
        if (contract.mode === 'blood_pact') {
          if (contract.current_day < contract.target_days) {
            // Preserves local midnight for next day
            const nextExpiresAt = new Date(contract.expires_at);
            nextExpiresAt.setHours(nextExpiresAt.getHours() + 24);

            const { data: updatedContract } = await adminClient
              .from('challenge_contracts')
              .update({
                current_day: contract.current_day + 1,
                problems_solved_today: 0,
                expires_at: nextExpiresAt.toISOString()
              })
              .eq('id', contract.id)
              .select()
              .single();

            if (now > nextExpiresAt) {
              // User was away across multiple days and missed Day 2's deadline
              await adminClient.rpc('incur_debt', {
                p_user_id: userId,
                p_amount: contract.penalty_cents
              });
              await adminClient
                .from('challenge_contracts')
                .update({ status: 'failed' })
                .eq('id', contract.id);
            } else if (updatedContract) {
              activeContracts.push(updatedContract);
            }
          } else {
            await adminClient
              .from('challenge_contracts')
              .update({ status: 'completed' })
              .eq('id', contract.id);
          }
        } else {
          await adminClient
            .from('challenge_contracts')
            .update({ status: 'completed' })
            .eq('id', contract.id);
        }
      }
    } else {
      activeContracts.push(contract);
    }
  }

  return activeContracts;
}

export interface ContractResolveItem {
  type: 'victory' | 'progress' | 'duplicate';
  mode: string;
  text: string;
}

export async function internalResolveContracts(
  userId: string,
  problemId: string,
  problemSlug?: string
): Promise<{
  contractsCountUpdated: number;
  duplicatesCount: number;
  anyContractCompleted: boolean;
  anyDailyQuotaMet: boolean;
  personaBonus: number;
  items: ContractResolveItem[];
}> {
  const adminClient = createSupabaseAdminClient();

  // 1. Fetch all active challenge contracts for this user
  const { data: contracts, error } = await adminClient
    .from('challenge_contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !contracts || contracts.length === 0) {
    return {
      contractsCountUpdated: 0,
      duplicatesCount: 0,
      anyContractCompleted: false,
      anyDailyQuotaMet: false,
      personaBonus: 0,
      items: [],
    };
  }

  const now = new Date();
  let contractsCountUpdated = 0;
  let duplicatesCount = 0;
  let anyContractCompleted = false;
  let anyDailyQuotaMet = false;
  let personaBonus = 0;
  const items: ContractResolveItem[] = [];

  for (const contract of contracts) {
    const expiresAt = new Date(contract.expires_at);
    const isQuotaMet = contract.mode === 'gauntlet'
      ? (contract.total_problems_solved || 0) >= contract.target_problems_per_day
      : (contract.problems_solved_today || 0) >= contract.target_problems_per_day;

    // Check expiration first
    if (now > expiresAt) {
      if (!isQuotaMet) {
        // Expired without meeting quota: fail contract and incur penalty
        await adminClient.rpc('incur_debt', { p_user_id: userId, p_amount: contract.penalty_cents });
        await adminClient.from('challenge_contracts').update({ status: 'failed' }).eq('id', contract.id);
        continue;
      } else if (contract.mode === 'blood_pact') {
        // Met previous quota, advance to next day
        if (contract.current_day < contract.target_days) {
          const nextExpiresAt = new Date(contract.expires_at);
          nextExpiresAt.setHours(nextExpiresAt.getHours() + 24);

          if (now > nextExpiresAt) {
            // User was away across multiple days and missed subsequent day's deadline
            await adminClient.rpc('incur_debt', { p_user_id: userId, p_amount: contract.penalty_cents });
            await adminClient.from('challenge_contracts').update({ status: 'failed' }).eq('id', contract.id);
            continue;
          }

          contract.current_day += 1;
          contract.problems_solved_today = 0;
          contract.expires_at = nextExpiresAt.toISOString();

          await adminClient.from('challenge_contracts').update({
            current_day: contract.current_day,
            problems_solved_today: 0,
            expires_at: nextExpiresAt.toISOString()
          }).eq('id', contract.id);
        } else {
          // Completed all days
          await adminClient.from('challenge_contracts').update({ status: 'completed' }).eq('id', contract.id);
          anyContractCompleted = true;
          continue;
        }
      } else {
        // Gauntlet completed when target reached
        await adminClient.from('challenge_contracts').update({ status: 'completed' }).eq('id', contract.id);
        anyContractCompleted = true;
        continue;
      }
    }

    // 2. Anti-Cheat Check: Deduplicate solves for this contract
    const { data: previousSubmissions } = await adminClient
      .from('submissions')
      .select('id, code')
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .eq('status', 'accepted')
      .ilike('code', `%${contract.id}%`);

    let isDuplicate = false;

    if (previousSubmissions && previousSubmissions.length > 0) {
      if (contract.mode === 'gauntlet') {
        // For Gauntlet: any previous solve of this problem in this contract is duplicate
        isDuplicate = true;
      } else if (contract.mode === 'blood_pact') {
        // For Blood Pact: check if solved on today's current_day
        for (const sub of previousSubmissions) {
          try {
            const parsed = JSON.parse(sub.code);
            if (parsed.day === contract.current_day) {
              isDuplicate = true;
              break;
            }
          } catch {
            isDuplicate = true;
            break;
          }
        }
      }
    }

    if (isDuplicate) {
      duplicatesCount++;
      items.push({
        type: 'duplicate',
        mode: contract.mode,
        text: `${contract.mode === 'gauntlet' ? 'Gauntlet' : 'Blood Pact'}: Already credited for this challenge`
      });
      continue; // Skip crediting this duplicate solve
    }

    // 3. Record credited solve in submissions
    await adminClient.from('submissions').insert({
      user_id: userId,
      problem_id: problemId,
      language: 'challenge_contract',
      code: JSON.stringify({
        contract_id: contract.id,
        day: contract.current_day,
        problem_slug: problemSlug || ''
      }),
      status: 'accepted'
    });

    // 4. Increment quota counts
    const newSolvedToday = (contract.problems_solved_today || 0) + 1;
    const newTotalSolved = (contract.total_problems_solved || 0) + 1;
    let newStatus = contract.status;

    if (contract.mode === 'gauntlet') {
      if (newTotalSolved >= contract.target_problems_per_day) {
        newStatus = 'completed';
        anyContractCompleted = true;
        items.push({
          type: 'victory',
          mode: 'gauntlet',
          text: `Gauntlet: CONQUERED! (${newTotalSolved}/${contract.target_problems_per_day} solved) 🏆`
        });
      } else {
        items.push({
          type: 'progress',
          mode: 'gauntlet',
          text: `Gauntlet: Progress (${newTotalSolved}/${contract.target_problems_per_day} solved) 📈`
        });
      }
    } else if (contract.mode === 'blood_pact') {
      if (newSolvedToday >= contract.target_problems_per_day) {
        anyDailyQuotaMet = true;
        if (contract.current_day >= contract.target_days) {
          newStatus = 'completed';
          anyContractCompleted = true;
          items.push({
            type: 'victory',
            mode: 'blood_pact',
            text: `Blood Pact: CONQUERED! All ${contract.target_days} days completed 🏆`
          });
        } else {
          items.push({
            type: 'victory',
            mode: 'blood_pact',
            text: `Blood Pact: Day ${contract.current_day} quota met (${newSolvedToday}/${contract.target_problems_per_day}) ✅`
          });
        }
      } else {
        items.push({
          type: 'progress',
          mode: 'blood_pact',
          text: `Blood Pact: Progress (${newSolvedToday}/${contract.target_problems_per_day} solved today, Day ${contract.current_day}/${contract.target_days}) 📈`
        });
      }
    }

    await adminClient
      .from('challenge_contracts')
      .update({
        problems_solved_today: newSolvedToday,
        total_problems_solved: newTotalSolved,
        status: newStatus,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', contract.id);

    contractsCountUpdated++;
    personaBonus += 5;
  }

  return {
    contractsCountUpdated,
    duplicatesCount,
    anyContractCompleted,
    anyDailyQuotaMet,
    personaBonus,
    items,
  };
}
