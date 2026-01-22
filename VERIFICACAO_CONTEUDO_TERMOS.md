# Verificação de Conteúdo dos Termos

Este documento contém o conteúdo extraído das páginas hardcoded para verificação antes da integração no banco de dados.

---

## 1. TERMS OF SERVICE (TermsOfService.tsx)

### Conteúdo HTML que será armazenado no banco:

```html
<div class="space-y-12">
  
  <section id="acceptance" class="scroll-mt-8">
    <div class="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        1. ACCEPTANCE OF TERMS
      </h2>
      <p class="text-gray-700 leading-relaxed text-lg">
        By accessing and using the Matrícula USA platform, you agree to comply with and be bound by these Terms of Service. 
        If you do not agree to any part of these terms, you should not use our services.
      </p>
    </div>
  </section>

  <section id="service-description" class="scroll-mt-8">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        2. SERVICE DESCRIPTION
      </h2>
    </div>
    
    <div class="grid md:grid-cols-2 gap-8">
      <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          2.1 Email Hub for Universities
        </h3>
        <ul class="space-y-3 text-gray-700">
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Secure Gmail OAuth 2.0 integration
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Professional institutional interface
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Organized tab system (Inbox, Sent, etc.)
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Real-time email counts
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Smart forwarding functionality
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Integrated composer & search
          </li>
        </ul>
      </div>

      <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          2.2 Scholarship Management
        </h3>
        <ul class="space-y-3 text-gray-700">
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Create and manage scholarships
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Student application process
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Document status management
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
            Integrated payment system
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section id="license" class="scroll-mt-8">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        3. LICENSE GRANT
      </h2>
    </div>
    
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-3">3.1 Limited License</h3>
        <p class="text-gray-700 text-sm">
          We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use 
          the Matrícula USA platform in accordance with these Terms.
        </p>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-3">3.2 Restrictions</h3>
        <p class="text-gray-700 mb-3 text-sm">You agree not to:</p>
        <ul class="space-y-2 text-sm text-gray-700">
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Use for illegal purposes
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Access unauthorized systems
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Interfere with operation
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Share credentials
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section id="third-party" class="scroll-mt-8">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        4. THIRD-PARTY DEPENDENCIES
      </h2>
    </div>
    
    <div class="space-y-6">
      <div class="bg-gray-50 border border-gray-200 p-6 rounded-lg">
        <h3 class="text-xl font-semibold text-gray-900 mb-3 flex items-center">
          4.1 Google APIs
        </h3>
        <p class="text-gray-700 mb-3">
          The "Email Hub" functionality depends on Google APIs and is subject to Google's Terms of Service. 
          By using this functionality, you agree to comply with:
        </p>
        <div class="space-y-2 text-sm text-gray-700">
          <div class="flex items-center">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
            <a href="https://policies.google.com/terms" class="text-gray-700 hover:text-[#05294E] hover:underline">Google Terms of Service</a>
          </div>
          <div class="flex items-center">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
            <a href="https://policies.google.com/privacy" class="text-gray-700 hover:text-[#05294E] hover:underline">Google Privacy Policy</a>
          </div>
          <div class="flex items-center">
            <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
            <a href="https://developers.google.com/terms/api-services-user-data-policy" class="text-gray-700 hover:text-[#05294E] hover:underline">Google API Services User Data Policy</a>
          </div>
        </div>
      </div>

      <div class="bg-gray-50 border border-gray-200 p-6 rounded-lg">
        <h3 class="text-xl font-semibold text-gray-900 mb-3">4.2 Other Providers</h3>
        <p class="text-gray-700 mb-3">Our platform also uses:</p>
        <div class="grid md:grid-cols-3 gap-4">
          <div class="text-center p-3 bg-white rounded border">
            <div class="text-sm font-medium text-gray-900">Supabase</div>
            <div class="text-xs text-gray-600">Data storage & auth</div>
          </div>
          <div class="text-center p-3 bg-white rounded border">
            <div class="text-sm font-medium text-gray-900">Stripe</div>
            <div class="text-xs text-gray-600">Payment processing</div>
          </div>
          <div class="text-center p-3 bg-white rounded border">
            <div class="text-sm font-medium text-gray-900">Vercel/Netlify</div>
            <div class="text-xs text-gray-600">Application hosting</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="intellectual-property" class="scroll-mt-8">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        5. INTELLECTUAL PROPERTY
      </h2>
    </div>
    
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 class="text-xl font-semibold text-[#05294E] mb-3">5.1 Platform Ownership</h3>
        <p class="text-gray-700 text-sm">
          The Matrícula USA platform, including its code, design, features, and content, is the exclusive 
          property of Matrícula USA and is protected by intellectual property laws.
        </p>
      </div>

      <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 class="text-xl font-semibold text-[#05294E] mb-3">5.2 Customer Data</h3>
        <p class="text-gray-700 text-sm mb-3">All customer data, including:</p>
        <ul class="space-y-2 text-sm text-gray-700">
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Email content
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Personal information
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Submitted documents
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Application history
          </li>
        </ul>
        <p class="text-gray-700 text-sm mt-3">
          Remains the exclusive property of the customer. Matrícula USA acts only as a processor of this data.
        </p>
      </div>
    </div>
  </section>

  <section id="responsibilities" class="scroll-mt-8">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        6. RESPONSIBILITIES
      </h2>
    </div>
    
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-3">6.1 User Responsibilities</h3>
        <ul class="space-y-2 text-gray-700">
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Provide true and accurate information
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Maintain security of credentials
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Use the platform responsibly
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Comply with applicable laws
          </li>
        </ul>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-3">6.2 Matrícula USA Responsibilities</h3>
        <ul class="space-y-2 text-gray-700">
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Maintain platform operation
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Protect user data according to Privacy Policy
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Provide adequate technical support
          </li>
          <li class="flex items-start">
            <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
            Notify about significant changes
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section class="grid md:grid-cols-3 gap-6">
    <div id="liability" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        7. LIMITATION OF LIABILITY
      </h3>
      <div class="space-y-2 text-sm text-gray-700">
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Data loss due to technical failures
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Temporary service interruptions
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Indirect or consequential damages
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Actions of third parties
        </div>
      </div>
    </div>

    <div id="suspension" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        8. SUSPENSION & TERMINATION
      </h3>
      <div class="space-y-2 text-sm text-gray-700">
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Violation of Terms
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Abusive platform use
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Payment failures
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
          Account termination rights
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <div id="modifications" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 class="text-md font-semibold text-gray-900 mb-2 flex items-center">
          9. MODIFICATIONS
        </h4>
        <p class="text-gray-700 text-sm">
          We reserve the right to modify these Terms. Significant changes communicated 30 days in advance.
        </p>
      </div>

      <div id="governing-law" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 class="text-md font-semibold text-gray-900 mb-2 flex items-center">
          10. GOVERNING LAW
        </h4>
        <p class="text-gray-700 text-sm">
          Governed by State laws, United States. Disputes resolved in local courts.
        </p>
      </div>
    </div>
  </section>

  <section class="space-y-6">
    <div id="arbitration" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
        11. ARBITRATION
      </h3>
      <p class="text-gray-700 text-sm">
        Any disputes arising from these Terms will be resolved through binding arbitration in accordance with 
        the American Arbitration Association rules.
      </p>
    </div>

    <div id="general-provisions" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        12. GENERAL PROVISIONS
      </h3>
      <div class="grid md:grid-cols-3 gap-4">
        <div class="text-center p-3 bg-white rounded border">
          <div class="text-sm font-medium text-gray-900">Entire Agreement</div>
          <div class="text-xs text-gray-600">Complete agreement between parties</div>
        </div>
        <div class="text-center p-3 bg-white rounded border">
          <div class="text-sm font-medium text-gray-900">Waiver</div>
          <div class="text-xs text-gray-600">Failure to exercise right ≠ waiver</div>
        </div>
        <div class="text-center p-3 bg-white rounded border">
          <div class="text-sm font-medium text-gray-900">Severability</div>
          <div class="text-xs text-gray-600">Invalid provisions don't affect others</div>
        </div>
      </div>
    </div>
  </section>

  <section id="contact" class="scroll-mt-8">
    <div class="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        13. CONTACT
      </h2>
      <p class="text-gray-700 mb-6">
        For questions about these Terms:
      </p>
      <div class="grid md:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div class="text-sm font-medium text-gray-900">Email</div>
          <div class="text-sm text-gray-600">info@matriculausa.com</div>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div class="text-sm font-medium text-gray-900">Phone</div>
          <div class="text-sm text-gray-600">+1 (213) 676-2544</div>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div class="text-sm font-medium text-gray-900">Address</div>
          <div class="text-sm text-gray-600">Los Angeles, CA, USA</div>
        </div>
      </div>
    </div>
  </section>
</div>
```

---

## 2. PRIVACY POLICY (PrivacyPolicy.tsx)

O conteúdo da Privacy Policy está no arquivo `PrivacyPolicy.tsx` e já foi extraído corretamente na migration anterior.

---

## VERIFICAÇÃO

### Por favor, verifique:

1. ✅ **Terms of Service**: Todo o conteúdo HTML acima está exatamente como no arquivo `TermsOfService.tsx` (linhas 59-486)
2. ✅ **Privacy Policy**: Já foi verificado anteriormente e está correto
3. ✅ **Classes Tailwind CSS**: Todas preservadas (border-l-4, border-[#05294E], bg-gray-50, etc.)
4. ✅ **Estrutura de seções**: Todas as 13 seções dos Terms of Service preservadas
5. ✅ **Links**: Links do Google mantidos intactos
6. ✅ **Informações de contato**: Email, telefone e endereço corretos

### Observações importantes:

- **Ícones removidos**: Os componentes React de ícones (CheckCircle, Mail, etc.) foram removidos pois não funcionam em HTML puro no banco. A estilização permanece idêntica.
- **Aspas simples**: Em SQL, aspas simples dentro de strings são escapadas com duas aspas simples (`Google's` vira `Google''s`)
- **Formatação**: A indentação e quebras de linha são preservadas para facilitar leitura no banco

---

## PRÓXIMOS PASSOS

Após sua aprovação:
1. Atualizar a migration `20250122000003_create_registration_terms.sql` com este conteúdo
2. Aplicar as migrations na ordem correta
3. Testar o sistema com novo usuário
