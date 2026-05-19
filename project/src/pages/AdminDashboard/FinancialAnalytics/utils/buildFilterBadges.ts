import type { FilterBadge } from '../components/FilterBadges';

const FEE_TYPE_LABELS: Record<string, string> = {
  // Selection Process
  selection_process: 'Selection Process',
  selection_process_fee: 'Selection Process',
  // Application
  application: 'Application Fee',
  application_fee: 'Application Fee',
  // Control Fee (inclui legados DS-160, I-539)
  control_fee: 'Control Fee',
  ds160_package: 'Control Fee',
  i539_package: 'Control Fee',
  i539_cos_package: 'Control Fee',
  // Legados absorvidos pelo Placement Fee
  scholarship: 'Placement Fee',
  scholarship_fee: 'Placement Fee',
  i20_control: 'Placement Fee',
  i20_control_fee: 'Placement Fee',
  // Placement
  placement: 'Placement Fee',
  placement_fee: 'Placement Fee',
  // Reinstatement (antigo Reinstatement Package)
  reinstatement: 'Reinstatement Fee',
  reinstatement_fee: 'Reinstatement Fee',
  reinstatement_package: 'Reinstatement Fee',
};

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  zelle: 'Zelle',
  parcelow: 'Parcelow',
  pix: 'PIX',
  manual: 'Outside Payments',
};

/**
 * Constrói o array de FilterBadge a partir dos filtros ativos do dashboard.
 * Deve ser chamado na página pai e passado para cada componente de gráfico.
 */
export function buildFilterBadges(
  filterFeeType: string[],
  filterPaymentMethod: string[],
  filterAffiliate: string[],
  affiliates: any[],
  filterValueMin: string,
  filterValueMax: string
): FilterBadge[] {
  const badges: FilterBadge[] = [];

  filterFeeType.forEach(ft => {
    badges.push({
      label: FEE_TYPE_LABELS[ft] || ft,
      color: 'blue',
    });
  });

  filterPaymentMethod.forEach(method => {
    badges.push({
      label: METHOD_LABELS[method] || method.charAt(0).toUpperCase() + method.slice(1),
      color: 'purple',
    });
  });

  filterAffiliate.forEach(id => {
    const affiliate = affiliates.find((a: any) => a.id === id);
    const name = affiliate?.name || affiliate?.email || id;
    badges.push({ label: `Affiliate: ${name}`, color: 'teal' });
  });

  if (filterValueMin) {
    badges.push({ label: `Min $${filterValueMin}`, color: 'orange' });
  }
  if (filterValueMax) {
    badges.push({ label: `Max $${filterValueMax}`, color: 'orange' });
  }

  return badges;
}
