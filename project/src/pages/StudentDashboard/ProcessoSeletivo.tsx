import { useState, useCallback, useMemo, useEffect } from 'react';
import { questions, sections, calculateScore } from '@/data/formQuestions';
import ProgressBar from '@/components/form/ProgressBar';
import QuestionField from '@/components/form/QuestionField';
import ResultsPage from '@/components/form/ResultsPage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, ClipboardCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { dispatchCacheInvalidationEvent, CacheInvalidationEvent } from '../../utils/cacheInvalidation';
import { useTranslation, Trans } from 'react-i18next';

const ProcessoSeletivo = () => {
    const { t } = useTranslation();
    const [currentSection, setCurrentSection] = useState(() => {
        const saved = localStorage.getItem('survey_current_section');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [completedSections, setCompletedSections] = useState<number[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>(() => {
        const saved = localStorage.getItem('survey_answers');
        return saved ? JSON.parse(saved) : {};
    });
    const [extraAnswers, setExtraAnswers] = useState<Record<number, string>>(() => {
        const saved = localStorage.getItem('survey_extra_answers');
        return saved ? JSON.parse(saved) : {};
    });
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(() => {
        return localStorage.getItem('survey_submitted') === 'true';
    });
    const [isSaving, setIsSaving] = useState(false);

    const { user, userProfile, refetchUserProfile } = useAuth();
    const navigate = useNavigate();

    // Pré-preencher dados do perfil se disponíveis
    useEffect(() => {
        if (!userProfile && !user) return;

        setAnswers(prev => {
            const next = { ...prev };
            let hasChanged = false;

            // Q1: Nome
            if (!next[1] && userProfile?.full_name) {
                next[1] = userProfile.full_name;
                hasChanged = true;
            }
            // Q2: Email
            if (!next[2] && (userProfile?.email || user?.email)) {
                next[2] = userProfile?.email || user?.email || '';
                hasChanged = true;
            }
            // Q3: WhatsApp
            if (!next[3] && userProfile?.phone) {
                next[3] = userProfile.phone;
                hasChanged = true;
            }
            // Q4: Nos EUA? (Verifica se o país é EUA)
            if (!next[4] && userProfile?.country) {
                const isUSA = ['usa', 'united states', 'eua', 'estados unidos'].includes(userProfile.country.toLowerCase());
                next[4] = isUSA ? 'Sim' : 'Não';
                hasChanged = true;
            }
            // Q8: Inglês (Mapeia termos técnicos para os valores do formulário)
            if (!next[8] && userProfile?.english_proficiency) {
                const proficiencyMap: Record<string, string> = {
                    'beginner': 'iniciante',
                    'elementary': 'iniciante',
                    'basic': 'basico',
                    'intermediate': 'intermediario',
                    'advanced': 'avancado',
                    'fluent': 'avancado'
                };
                const level = userProfile.english_proficiency.toLowerCase();
                const mapped = proficiencyMap[level] || (['iniciante', 'basico', 'intermediario', 'avancado'].includes(level) ? level : null);
                if (mapped) {
                    next[8] = mapped;
                    hasChanged = true;
                }
            }
            // Q14: Escolaridade (Se tem nível acadêmico definido, assumimos que tem o diploma)
            if (!next[14] && userProfile?.academic_level) {
                const hasDiploma = ['high-school', 'undergraduate', 'graduate', 'master', 'doctorate'].includes(userProfile.academic_level.toLowerCase());
                if (hasDiploma) {
                    next[14] = 'a'; // Opção "a" no questionário é "Sim, consigo enviar"
                    hasChanged = true;
                }
            }

            return hasChanged ? next : prev;
        });
    }, [userProfile, user]);

    // Garantir que a página sempre volte ao topo ao mudar de seção
    useEffect(() => {
        // Busca o container específico do dashboard pelo ID
        const dashboardContainer = document.getElementById('student-dashboard-content');

        if (dashboardContainer) {
            // Tenta rolagem suave primeiro
            dashboardContainer.scrollTo({ top: 0, behavior: 'smooth' });

            // Reforço após pequeno delay para garantir
            setTimeout(() => {
                if (dashboardContainer.scrollTop > 0) {
                    dashboardContainer.scrollTop = 0;
                }
            }, 100);
        } else {
            // Fallback para window se não estiver no dashboard layout
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentSection]);

    // Persistir rascunho no localStorage
    useEffect(() => {
        localStorage.setItem('survey_answers', JSON.stringify(answers));
    }, [answers]);

    useEffect(() => {
        localStorage.setItem('survey_extra_answers', JSON.stringify(extraAnswers));
    }, [extraAnswers]);

    useEffect(() => {
        localStorage.setItem('survey_current_section', currentSection.toString());
    }, [currentSection]);

    // Persistir submit status
    useEffect(() => {
        if (submitted) {
            localStorage.setItem('survey_submitted', 'true');
        } else {
            // Só remove se for explicitamente false (reset), a limpeza completa é no clearDraft
            if (localStorage.getItem('survey_submitted')) {
                localStorage.removeItem('survey_submitted');
            }
        }
    }, [submitted]);

    const clearDraft = useCallback(() => {
        localStorage.removeItem('survey_answers');
        localStorage.removeItem('survey_extra_answers');
        localStorage.removeItem('survey_current_section');
        localStorage.removeItem('survey_submitted');
    }, []);

    const currentQuestions = useMemo(() => {
        const section = sections[currentSection];
        return questions.filter(
            (q) => q.id >= section.range[0] && q.id <= section.range[1]
        );
    }, [currentSection]);

    const validateSection = useCallback(() => {
        const newErrors: Record<number, string> = {};
        let isValid = true;

        currentQuestions.forEach((q) => {
            // Check if question is visible (conditional)
            let isVisible = true;
            if (q.conditionalOn) {
                const parentAnswer = answers[q.conditionalOn.questionId];
                isVisible = parentAnswer === q.conditionalOn.value;
            }

            if (isVisible && q.required) {
                if (!answers[q.id]) {
                    newErrors[q.id] = 'selectionSurvey.required';
                    isValid = false;
                } else if (q.id === 4) {
                    // Validação especial para a pergunta 4 ("Sim")
                    const answer = answers[q.id];
                    if (['Sim', 'Yes', 'Sí', 'sim', 'yes', 'sí'].includes(answer)) {
                        if (!answers[-4]) {
                            newErrors[-4] = 'selectionSurvey.required';
                            isValid = false;
                        }
                        if (!answers[-41]) {
                            newErrors[-41] = 'selectionSurvey.required';
                            isValid = false;
                        }
                    }
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    }, [currentQuestions, answers]);

    const handleNext = useCallback(() => {
        if (!validateSection()) {
            toast.error(t('selectionSurvey.toastErrorFields'));
            return;
        }

        setCompletedSections((prev) => [...new Set([...prev, currentSection])]);
        if (currentSection < sections.length - 1) {
            setCurrentSection((prev) => prev + 1);

            // Scroll suave usando o ID específico
            const dashboardContainer = document.getElementById('student-dashboard-content');
            if (dashboardContainer) {
                dashboardContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [currentSection, validateSection, sections.length, t]);

    const handleBack = useCallback(() => {
        if (currentSection > 0) {
            setCurrentSection((prev) => prev - 1);

            // Scroll suave usando o ID específico
            const dashboardContainer = document.getElementById('student-dashboard-content');
            if (dashboardContainer) {
                dashboardContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            navigate('/student/dashboard/overview');
        }
    }, [currentSection, navigate]);

    const handleAnswer = useCallback((questionId: number, value: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
    }, []);

    const handleExtraAnswer = useCallback((questionId: number, value: string) => {
        setExtraAnswers((prev) => ({ ...prev, [questionId]: value }));
    }, []);

    // ...

    const handleSubmit = useCallback(async () => {
        if (!validateSection()) {
            toast.error(t('selectionSurvey.toastErrorFields'));
            return;
        }

        setIsSaving(true);
        const { score, total, percentage } = calculateScore(answers);
        const passed = percentage >= 80;

        console.log('🔍 [Processo Seletivo] Submit:', {
            score,
            total,
            percentage,
            passed,
            userId: user?.id
        });

        try {
            if (!user) {
                toast.error(t('selectionSurvey.toastErrorAuth'));
                return;
            }

            // Salvar a submissão detalhada
            const { error: submissionError } = await supabase
                .from('submissions')
                .upsert({
                    user_id: user.id,
                    name: answers[1] || userProfile?.full_name,
                    email: answers[2] || user.email,
                    whatsapp: answers[3],
                    profile_type: answers[5],
                    answers,
                    extra_answers: extraAnswers,
                    score,
                    total,
                    percentage,
                    passed,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (submissionError) throw submissionError;

            // Se passou, atualizar o perfil do usuário
            if (passed) {
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .update({ selection_survey_passed: true })
                    .eq('user_id', user.id);

                if (profileError) throw profileError;

                // clearDraft(); // REMOVIDO: Limpar apenas ao sair da tela de resultados
                dispatchCacheInvalidationEvent(CacheInvalidationEvent.PROFILE_UPDATED);
                await refetchUserProfile();
            } else {
                // Se falhou, garantir que o status seja false no banco
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .update({ selection_survey_passed: false })
                    .eq('user_id', user.id);

                if (profileError) {
                    console.error('Erro ao atualizar status de reprovação:', profileError);
                }

                // Importante: atualizar o perfil localmente para refletir o bloqueio imediato na sidebar
                dispatchCacheInvalidationEvent(CacheInvalidationEvent.PROFILE_UPDATED);
                await refetchUserProfile();
            }

            setSubmitted(true);
            // Scroll suave usando o ID específico do dashboard
            const dashboardContainer = document.getElementById('student-dashboard-content');
            if (dashboardContainer) {
                dashboardContainer.scrollTo({ top: 0, behavior: 'smooth' });
                // Garantia extra
                setTimeout(() => {
                    dashboardContainer.scrollTop = 0;
                }, 100);
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error: any) {
            console.error('Erro ao salvar questionário:', error);
            toast.error(t('selectionSurvey.toastErrorSave'));
        } finally {
            setIsSaving(false);
        }
    }, [validateSection, answers, extraAnswers, user, userProfile, refetchUserProfile, t]); // clearDraft removido das deps se não usado

    const handleRestart = useCallback(() => {
        clearDraft();
        setAnswers({});
        setExtraAnswers({});
        setErrors({});
        setCurrentSection(0);
        setCompletedSections([]);
        setSubmitted(false);

        const dashboardContainer = document.getElementById('student-dashboard-content');
        if (dashboardContainer) {
            dashboardContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [clearDraft]);

    const handleAutoFill = useCallback(() => {
        const newAnswers: Record<number, string> = {};
        const newExtraAnswers: Record<number, string> = {};
        const allQuestions = questions;

        allQuestions.forEach((q) => {
            if (q.type === 'text' || q.type === 'textarea') {
                newAnswers[q.id] = `Teste Auto ${q.id}`;
            } else if (q.type === 'email') {
                newAnswers[q.id] = `autofill${q.id}@teste.com`;
            } else if (q.type === 'number') {
                newAnswers[q.id] = Math.floor(Math.random() * 1000).toString();
            } else if (q.type === 'date') {
                newAnswers[q.id] = '2023-01-01';
            } else if ((q.type === 'radio' || q.type === 'truefalse') && q.options) {
                // Tenta achar a correta para garantir aprovação
                const correctOption = q.options.find(opt => typeof opt === 'object' && opt.correct === true);

                if (correctOption && typeof correctOption === 'object') {
                    newAnswers[q.id] = correctOption.value;
                } else {
                    // Aleatório se não tiver correta definida
                    const randomIdx = Math.floor(Math.random() * q.options.length);
                    const opt = q.options[randomIdx];
                    const val = typeof opt === 'string' ? opt : opt.value;
                    newAnswers[q.id] = val;
                }

            } else if (q.type === 'yesno') {
                // Para yesno, verifiquemos se tem lógica específica ou se qualquer um serve
                // Q4 logic
                if (q.id === 4) {
                    newAnswers[q.id] = 'Sim';
                    newAnswers[-4] = 'B2';
                    newAnswers[-41] = '2026-12-31';
                } else {
                    newAnswers[q.id] = 'Sim';
                }
            }
        });

        setAnswers(newAnswers);
        setExtraAnswers(newExtraAnswers);

        // Mark all previous sections as completed
        setCompletedSections(sections.map((_, idx) => idx).slice(0, -1));
        // Go to last section
        setCurrentSection(sections.length - 1);

        toast.success('Formulário preenchido (Modo Aprovação)');
    }, []);

    const handleEdit = useCallback(() => {
        setSubmitted(false);
        setCurrentSection(0); // Voltar para a primeira seção para revisão completa
        const dashboardContainer = document.getElementById('student-dashboard-content');
        if (dashboardContainer) {
            dashboardContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleFinish = useCallback(() => {
        clearDraft();
        // Garantir que a sidebar e o estado global saibam que o aluno passou
        dispatchCacheInvalidationEvent(CacheInvalidationEvent.PROFILE_UPDATED);
        navigate('/student/dashboard/scholarships');
    }, [navigate, clearDraft]);

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50">
                <main className="max-w-4xl mx-auto px-4 py-12">
                    <ResultsPage
                        answers={answers}
                        onRestart={handleRestart}
                        onEdit={handleEdit}
                        onFinish={handleFinish}
                    />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">

            <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold mb-4 border border-blue-100 uppercase tracking-wider">
                        <ClipboardCheck className="w-4 h-4" />
                        {t('selectionSurvey.mandatoryBadge')}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        {t('selectionSurvey.title')}
                    </h1>
                    <div className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        <Trans
                            i18nKey="selectionSurvey.subtitle"
                            components={[<span key="0" className="text-blue-600 font-bold" />]}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 md:p-10 relative overflow-hidden">
                    {/* Decorative background circle */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 z-0" />

                    <div className="relative z-10">
                        <ProgressBar currentSection={currentSection} completedSections={completedSections} />

                        <div className="space-y-6 mt-8">
                            <div className="pb-6 border-b border-slate-100 mb-8">
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {t(sections[currentSection]?.title)}
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    {t('selectionSurvey.sectionsInfo')}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {currentQuestions.map((q) => (
                                    <QuestionField
                                        key={q.id}
                                        question={q}
                                        value={answers[q.id]}
                                        extraValue={extraAnswers[q.id]}
                                        onChange={(val, customId) => handleAnswer(customId ?? q.id, val)}
                                        onExtraChange={(val) => handleExtraAnswer(q.id, val)}
                                        error={errors[q.id]}
                                        answers={answers}
                                    />
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    className="w-full sm:w-auto gap-2 text-slate-600 border-slate-200 bg-transparent hover:bg-slate-100 hover:text-slate-900 rounded-xl px-6 h-12 font-medium transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('selectionSurvey.back')}
                                </Button>

                                {import.meta.env.DEV && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleAutoFill}
                                        className="text-xs text-slate-300 hover:text-slate-500"
                                    >
                                        Auto-Fill (Dev)
                                    </Button>
                                )}

                                {currentSection === sections.length - 1 ? (
                                    <Button
                                        variant="ghost"
                                        onClick={handleSubmit}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-10 py-6 text-lg shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1"
                                    >
                                        {isSaving ? t('selectionSurvey.submitting') : t('selectionSurvey.finish')}
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        onClick={handleNext}
                                        className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-10 py-6 text-lg shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1"
                                    >
                                        {t('selectionSurvey.nextSection')}
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center mt-8 text-slate-400 text-xs tracking-wide uppercase font-semibold">
                    {t('selectionSurvey.copyright')}
                </p>
            </main>
        </div>
    );
};

export default ProcessoSeletivo;
