import type { FilterBadge } from '../components/FilterBadges';

const FEE_TYPE_LABELS: Record<string, string> = {
  // Selection Process
  selection_process: 'Selection Process',
  selection_process_fee: 'Selection Process',
  // Application
  application: 'Application Fee',
  application_fee: 'Application Fee',
  // Scholarship
  scholarship: 'Scholarship Fee',
  scholarship_fee: 'Scholarship Fee',
  // I-20 Control
  i20_control: 'I-20 Control Fee',
  i20_control_fee: 'I-20 Control Fee',
  // DS-160 Package (separado)
  ds160_package: 'DS-160 Package',
  // I-539 Package (separado)
  i539_package: 'I-539 Package',
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
