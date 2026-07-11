export function calculateIncomeAllocation({
  amountCents,
  livingBalanceCents,
  livingTargetCents,
  savingsRateBps,
}: {
  amountCents: number;
  livingBalanceCents: number;
  livingTargetCents: number;
  savingsRateBps: number;
}) {
  const livingGapCents = Math.max(livingTargetCents - livingBalanceCents, 0);
  const livingCents = Math.min(amountCents, livingGapCents);
  const remainderCents = amountCents - livingCents;
  const savingsCents = Math.floor((remainderCents * savingsRateBps) / 10_000);
  const flexibleCents = remainderCents - savingsCents;

  return { livingCents, savingsCents, flexibleCents };
}
