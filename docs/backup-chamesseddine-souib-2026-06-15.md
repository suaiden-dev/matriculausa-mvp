# Backup — Chamesseddine souib
**Data do backup:** 2026-06-15  
**Motivo:** Remoção de todas as scholarship_applications + reset do onboarding para step de seleção de bolsa

---

## Perfil (user_profiles)

| Campo | Valor |
|---|---|
| id (profile) | `4994a8b4-bc83-4d28-b31b-a6f2562763f9` |
| user_id (auth) | `bbb9711f-a057-49a4-bc05-535f1be8767d` |
| full_name | Chamesseddine souib |
| email | chamess.souib@gmail.com |
| phone | +15715648911 |
| academic_level | graduate |
| gpa | 2.00 |
| english_proficiency | advanced |
| student_process_type | transfer |
| visa_transfer_active | true |
| status | active |
| onboarding_completed | false |
| **onboarding_current_step** | **documents_upload** |
| selected_scholarship_id | null |
| selected_application_id | null |
| is_application_fee_paid | false |
| has_paid_selection_process_fee | true |
| selection_process_paid_at | 2026-05-19T23:32:31Z |
| is_scholarship_fee_paid | false |
| documents_status | approved |
| documents_uploaded | true |
| selection_survey_passed | true |
| placement_fee_flow | true |
| placement_fee_pending_balance | 0.00 |
| total_paid | 0 |
| created_at | 2026-05-19T22:48:29Z |

---

## Documentos (student_documents)

| Tipo | Status | Uploaded | Approved |
|---|---|---|---|
| passport | approved | 2026-05-20T23:22:20Z | 2026-05-20T23:43:37Z |
| diploma | approved | 2026-05-20T23:22:20Z | 2026-05-20T23:43:37Z |
| funds_proof | approved | 2026-05-20T23:22:20Z | 2026-05-20T23:43:37Z |

---

## Scholarship Applications (antes da remoção)

### 1. Special Scholarship — Caroline University ✅ APPROVED
| Campo | Valor |
|---|---|
| id | `52bb5e27-ee5d-4b21-acd7-4a64c8ba1378` |
| scholarship_id | `aaa3baa9-3df0-48a9-b843-bc83e1c05720` |
| status | **approved** |
| applied_at | 2026-05-20T01:27:40Z |
| student_process_type | transfer |
| is_application_fee_paid | false |
| is_scholarship_fee_paid | false |
| acceptance_letter_status | pending |
| i20_document_status | pending |
| notes | null |
| annual_value_with_scholarship | $4,200 |

**Documentos na aplicação:**
- passport → approved (2026-05-20T23:37:42Z)
- diploma → approved (2026-05-20T23:37:44Z)
- funds_proof → approved (2026-05-20T23:37:46Z)

---

### 2. Academic Excellence Scholarship — Caroline University ❌ REJECTED
| Campo | Valor |
|---|---|
| id | `52415a9c-1456-4380-a542-716a2c3da931` |
| scholarship_id | `da35a007-57f4-422e-a6d0-d02a01f62ff5` |
| status | **rejected** |
| applied_at | 2026-05-20T23:22:22Z |
| is_application_fee_paid | false |
| is_scholarship_fee_paid | false |
| acceptance_letter_status | pending |
| notes | "You are not eligible for this scholarship / A master's degree is required" |
| annual_value_with_scholarship | $4,200 |

**Documentos na aplicação:**
- passport → approved
- diploma → approved
- funds_proof → approved

---

### 3. Doctor of Business Administration Scholarship — Oikos University Los Angeles ❌ REJECTED
| Campo | Valor |
|---|---|
| id | `a9ab2cae-623a-426a-8e0d-711069203a76` |
| scholarship_id | `4c97b92d-e8ec-4b03-9fb9-43d57321f403` |
| status | **rejected** |
| applied_at | 2026-05-20T01:27:39Z |
| is_application_fee_paid | false |
| is_scholarship_fee_paid | false |
| notes | "You are not eligible for this scholarship" |
| annual_value_with_scholarship | $4,200 |

**Documentos na aplicação:**
- passport → approved
- diploma → **rejected** ("You are not eligible for this scholarship")
- funds_proof → approved

---

### 4. Genius Scholarship — Caroline University ❌ REJECTED
| Campo | Valor |
|---|---|
| id | `60828736-fee4-4694-8288-3e7d8ec55b9a` |
| scholarship_id | `3405d4d3-f76e-4a6b-b7eb-b60d8c0e532a` |
| status | **rejected** |
| applied_at | 2026-05-20T01:27:39Z |
| is_application_fee_paid | false |
| is_scholarship_fee_paid | false |
| notes | "You are not eligible for this scholarship" |
| annual_value_with_scholarship | $4,200 |

**Documentos na aplicação:**
- passport → approved
- diploma → **rejected** ("A master's degree is required")
- funds_proof → approved

---

## Notas Admin (admin_notes)

| Data | Admin | Nota |
|---|---|---|
| 2026-05-22T21:24:17Z | Rayssa Tenório | "Vai pensar sobre a bolsa e ficou de dar um retorno posteriormente." |
| 2026-06-08T20:48:32Z | Rayssa Tenório | "Quer desistir e perguntou do reembolso — informei que não tinha." |

---

## Como reverter

Para restaurar o estado anterior, recriar os 4 registros na tabela `scholarship_applications` com os IDs e valores acima, e atualizar `user_profiles` com:
- `onboarding_current_step = 'documents_upload'`
- `selected_scholarship_id = null`
- `selected_application_id = null`
