import React from 'react';
import { 
  CreditCard, 
  FileText, 
  Shield, 
  Plane,
  DollarSign,
  GraduationCap,
  FileCheck,
  CheckCircle,
  Award,
  Users,
  Send,
  Mail,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ProcessoDetalhado: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Processo para Bolsa de Estudos
          </h1>
          <div className="inline-block bg-[#D0151C] text-white px-6 py-2 rounded-full font-bold text-lg mb-8">
            Visto F1 - Initial
          </div>
          <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
            Entenda todas as etapas, taxas e documentos necessários para conquistar sua bolsa de estudos nos Estados Unidos
          </p>
        </div>
      </section>

      {/* Taxas e Etapas Section */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black text-center mb-4 text-[#05294E]">
            Taxas e Etapas do Processo
          </h2>
          <p className="text-center text-slate-600 text-lg mb-12 max-w-2xl mx-auto">
            Investimento necessário para cada fase do seu processo de admissão e visto
          </p>
          
          <div className="space-y-8">
            {/* Etapa 1 */}
            <div className="bg-slate-50 rounded-3xl shadow-xl p-8 border border-slate-200 hover:-translate-y-2 transition-transform duration-300">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                    <CreditCard className="h-10 w-10" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-3xl font-bold text-[#05294E] mb-2 md:mb-0">
                      1. Processo Seletivo
                    </h3>
                    <div className="text-3xl font-black text-green-600">
                      $350
                    </div>
                  </div>
                  <p className="text-slate-700 text-lg mb-4">
                    Para darmos início ao processo favor enviar o pagamento do processo seletivo por <strong>Zelle</strong> para o e-mail: <strong className="text-[#05294E]">info@thefutureofenglish.com</strong> ou se preferir <strong>cartão de crédito</strong> Clique e pague aqui.
                  </p>
                  <div className="bg-white rounded-xl p-6 border-2 border-blue-100">
                    <h4 className="font-bold text-[#05294E] mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Você receberá um email solicitando os seguintes documentos:
                    </h4>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Cópia dos passaportes</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Histórico escolar do ensino médio (para bacharel) ou superior (para mestrado)</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Comprovante de fundos com no mínimo <strong>$22.000</strong> para o aplicante principal e <strong>$5.000</strong> por dependente</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Você receberá uma lista com os programas que te aceitaram</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Você deve escolher o programa que melhor te atende</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Etapa 2 */}
            <div className="bg-slate-50 rounded-3xl shadow-xl p-8 border border-slate-200 hover:-translate-y-2 transition-transform duration-300">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <GraduationCap className="h-10 w-10" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-3xl font-bold text-[#05294E] mb-2 md:mb-0">
                      2. Application Fee (Taxa de Matrícula)
                    </h3>
                    <div className="text-3xl font-black text-blue-600">
                      $350
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                    <p className="text-slate-700 text-lg">
                      <strong className="text-blue-700">$350</strong> - Application fee <span className="text-slate-500">+</span> <strong className="text-blue-700">$100</strong> por dependente
                    </p>
                  </div>
                  <p className="text-slate-700 text-lg">
                    Aqui você recebe os formulários para a <strong>Application (Matrícula)</strong> e envia sua candidatura aos programas escolhidos.
                  </p>
                  <div className="mt-3 bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-sm text-slate-600 italic">
                      💳 Pagamento feito dentro da plataforma MatriculaUSA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Etapa 3 - Scholarship Fee */}
            <div className="bg-slate-50 rounded-3xl shadow-xl p-8 border border-slate-200 hover:-translate-y-2 transition-transform duration-300">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-lg">
                    <Award className="h-10 w-10" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-3xl font-bold text-[#05294E] mb-2 md:mb-0">
                      3. Scholarship Fee (Escolha de Vaga com Bolsa)
                    </h3>
                    <div className="text-3xl font-black text-amber-600">
                      $550
                    </div>
                  </div>
                  <p className="text-slate-700 text-lg mb-2">
                    Taxa para escolha e confirmação da vaga com bolsa de estudos no programa selecionado.
                  </p>
                  <div className="mt-3 bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-sm text-slate-600 italic">
                      💳 Pagamento feito dentro da plataforma MatriculaUSA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Etapa 4 - I20 Control Fee */}
            <div className="bg-slate-50 rounded-3xl shadow-xl p-8 border border-slate-200 hover:-translate-y-2 transition-transform duration-300">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shadow-lg">
                    <Shield className="h-10 w-10" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-3xl font-bold text-[#05294E] mb-2 md:mb-0">
                      4. I20 Control Fee
                    </h3>
                    <div className="text-3xl font-black text-purple-600">
                      $900
                    </div>
                  </div>
                  <p className="text-slate-700 text-lg mb-2">
                    Controle de <strong>I-20</strong> durante o processo.
                  </p>
                  <div className="bg-purple-50 rounded-xl p-4 mb-3 border border-purple-200">
                    <p className="text-slate-700 flex items-center">
                      <CheckCircle className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0" />
                      <span>Pagamento ao receber a <strong>carta de aceite</strong></span>
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <p className="text-sm text-slate-600 italic">
                      💳 Pagamento feito dentro da plataforma MatriculaUSA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Etapa 5 - Processo de Visto */}
            <div className="bg-slate-50 rounded-3xl shadow-xl p-8 border border-slate-200 hover:-translate-y-2 transition-transform duration-300">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D0151C] to-red-600 flex items-center justify-center text-white shadow-lg">
                    <Plane className="h-10 w-10" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-[#05294E] mb-4">
                    5. Honorários do Processo de Visto
                  </h3>
                  <p className="text-slate-700 text-lg mb-4">
                    Inclui: <strong>Preenchimento da DS-160</strong>, <strong>agendamento</strong> e <strong>treinamento para a entrevista</strong>.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <p className="text-sm text-slate-600 mb-1">Aplicante Principal</p>
                      <p className="text-2xl font-bold text-[#D0151C]">$900</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <p className="text-sm text-slate-600 mb-1">Por Dependente</p>
                      <p className="text-2xl font-bold text-[#D0151C]">$100</p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-6 mb-3 border-2 border-yellow-200">
                    <h4 className="font-bold text-[#05294E] mb-3 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      MAIS TAXAS DO GOVERNO:
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">Taxa Sevis</span>
                        <span className="font-bold text-lg text-[#05294E]">$350</span>
                      </div>
                      <div className="h-px bg-yellow-200"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">Taxa da Imigração (Consulado)</span>
                        <span className="font-bold text-lg text-[#05294E]">$185</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-slate-300">
                    <p className="text-sm text-slate-700 font-medium">
                      ⚠️ Estas taxas <strong>NÃO</strong> são pagas dentro da plataforma MatriculaUSA
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona na Prática Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black text-center mb-4 text-[#05294E]">
            Como Funciona o Processo com a MatriculaUSA
          </h2>
          <p className="text-center text-slate-600 text-lg mb-4 max-w-2xl mx-auto">
            Passo a passo simplificado da sua jornada até a aprovação do visto
          </p>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-12 max-w-3xl mx-auto">
            <p className="text-center text-sm text-slate-700">
              💳 <strong>Taxas pagas na plataforma MatriculaUSA:</strong> Selection Process Fee, Application Fee, Scholarship Fee e I20 Control Fee
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Linha vertical conectando os passos (apenas em desktop) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-blue-400 to-blue-600 transform -translate-x-1/2"></div>

            <div className="space-y-12">
              {/* Passo 1 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:text-right md:pr-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center md:justify-end">
                        <CreditCard className="h-6 w-6 mr-2 text-green-600" />
                        Paga a Selection Process Fee
                      </h3>
                      <p className="text-slate-600">
                        Você faz o pagamento da taxa de processo seletivo (por Zelle ou cartão). A MatriculaUSA analisa seu perfil e seus documentos.
                      </p>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      1
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12"></div>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:pr-12"></div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      2
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center">
                        <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
                        Acessa programas disponíveis
                      </h3>
                      <p className="text-slate-600">
                        Você tem acesso a todos os programas e universidades disponíveis na plataforma. Você mesmo navega e escolhe quais programas fazem mais sentido para você.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:text-right md:pr-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center md:justify-end">
                        <CheckCircle className="h-6 w-6 mr-2 text-purple-600" />
                        Escolhe e paga Application Fee
                      </h3>
                      <p className="text-slate-600">
                        Você escolhe os programas/universidades que mais fazem sentido para você e paga a <strong>Application Fee</strong> dentro da plataforma MatriculaUSA.
                      </p>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      3
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12"></div>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:pr-12"></div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      4
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-yellow-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center">
                        <Send className="h-6 w-6 mr-2 text-yellow-600" />
                        Applications são enviadas
                      </h3>
                      <p className="text-slate-600">
                        Os formulários e documentos são enviados para cada escola/universidade escolhida. Sua candidatura é analisada pelas instituições.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passo 5 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:text-right md:pr-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-emerald-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center md:justify-end">
                        <Award className="h-6 w-6 mr-2 text-emerald-600" />
                        Recebe cartas de aceite
                      </h3>
                      <p className="text-slate-600">
                        As escolas retornam com as respostas. Você recebe as <strong>cartas de aceite</strong> dos programas que te aprovaram.
                      </p>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      5
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12"></div>
                </div>
              </div>

              {/* Passo 6 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:pr-12"></div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      6
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-amber-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center">
                        <DollarSign className="h-6 w-6 mr-2 text-amber-600" />
                        Paga Scholarship Fee
                      </h3>
                      <p className="text-slate-600">
                        Você escolhe o programa final e paga a <strong>Scholarship Fee</strong> (taxa de escolha de vaga com bolsa) dentro da plataforma MatriculaUSA.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passo 7 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:text-right md:pr-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-indigo-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center md:justify-end">
                        <Shield className="h-6 w-6 mr-2 text-indigo-600" />
                        Paga I20 Control Fee
                      </h3>
                      <p className="text-slate-600">
                        Ao receber a carta de aceite, você paga a <strong>I20 Control Fee</strong> dentro da plataforma para acompanhamento do documento.
                      </p>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      7
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12"></div>
                </div>
              </div>

              {/* Passo 8 */}
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/2 md:pr-12"></div>
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D0151C] to-red-600 text-white flex items-center justify-center text-2xl font-black shadow-xl border-4 border-white z-10 relative">
                      8
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
                      <h3 className="text-2xl font-bold text-[#05294E] mb-2 flex items-center">
                        <Plane className="h-6 w-6 mr-2 text-[#D0151C]" />
                        Processo de visto F1
                      </h3>
                      <p className="text-slate-600 mb-2">
                        Preenchimento da DS-160, agendamento e treinamento para a entrevista. 
                      </p>
                      <p className="text-sm text-slate-500 italic">
                        As taxas do governo (SEVIS $350 + Consulado $185) e honorários de visto ($900 principal + $100 por dependente) <strong>não são pagos na plataforma</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="py-20 bg-gradient-to-br from-[#05294E] to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Pronto para Começar Sua Jornada?
          </h2>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
            Entre em contato conosco e dê o primeiro passo rumo à sua educação nos Estados Unidos
          </p>
          <a
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-[#D0151C] hover:bg-red-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            Começar Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </div>
      </section>
    </div>
  );
};

export default ProcessoDetalhado;

