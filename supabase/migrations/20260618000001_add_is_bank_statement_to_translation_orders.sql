alter table translation_orders
  add column if not exists is_bank_statement boolean not null default false;

update translation_orders
  set is_bank_statement = true
  where document_type = 'bank_statement';

update translation_orders
  set document_type = 'certified'
  where document_type = 'bank_statement';
