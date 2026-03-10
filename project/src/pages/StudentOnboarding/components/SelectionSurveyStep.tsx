import { useState, useCallback, useMemo, useEffect } from 'react';
import { questions, sections, calculateScore } from '@/data/formQuestions';
import ProgressBar from '@/components/form/ProgressBar';
import QuestionField from '@/components/form/QuestionField';
import ResultsPage from '@/components/form/ResultsPage';
import { Button } from '@/components/ui/button';
import { FastForward, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation, Trans } from 'react-i18next';
import { StepProps } from '../types';
import { dispatchCacheInvalidationEvent, CacheInvalidationEvent } from '../../../utils/cacheInvalidation';

export const SelectionSurveyStep: React.FC<StepProps> = ({ onNext }) => {
    const { t } = useTranslation();
    const [currentSection, setCurrentSection] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>(() => {
        const saved = localStorage.getItem('onboarding_survey_answers');
        return saved ? JSON.parse(saved) : {};
    });
    const [extraAnswers, setExtraAnswers] = useState<Record<number, string>>(() => {
        const saved = localStorage.getItem('onboarding_survey_extra_answers');
        return saved ? JSON.parse(saved) : {};
    });
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState<boolean>(() => {
        return localStorage.getItem('onboarding_survey_submitted') === 'true';
    });
    const [isSaving, setIsSaving] = useState(false);

    const { user, userProfile, refetchUserProfile } = useAuth();

    // Se o usuário já passou no banco de dados, queremos mostrar a tela de resultados
    useEffect(() => {
        if (userProfile?.selection_survey_passed) {
            setSubmitted(true);
            localStorage.setItem('onboarding_survey_submitted', 'true');
        }
    }, [userProfile?.selection_survey_passed]);

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';


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
            
            return hasChanged ? next : prev;
        });
    }, [userProfile, user]);

    // Persistir rascunho no localStorage
    useEffect(() => {
        localStorage.setItem('onboarding_survey_answers', JSON.stringify(answers));
    }, [answers]);

    useEffect(() => {
        localStorage.setItem('onboarding_survey_extra_answers', JSON.stringify(extraAnswers));
    }, [extraAnswers]);

    // Persistir submit status
    useEffect(() => {
        if (submitted) {
            localStorage.setItem('onboarding_survey_submitted', 'true');
        }
    }, [submitted]);

    const clearDraft = useCallback(() => {
        localStorage.removeItem('onboarding_survey_answers');
        localStorage.removeItem('onboarding_survey_extra_answers');
        localStorage.removeItem('onboarding_survey_submitted');
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

    const checkSectionComplete = useCallback((sectionIndex: number) => {
        const section = sections[sectionIndex];
        const questionsInSection = questions.filter(q => q.id >= section.range[0] && q.id <= section.range[1]);
        return questionsInSection.every(q => {
            let isVisible = true;
            if (q.conditionalOn) {
                const parentAnswer = answers[q.conditionalOn.questionId];
                isVisible = parentAnswer === q.conditionalOn.value;
            }
            if (!isVisible) return true;
            if (q.required && !answers[q.id]) return false;
            
            // Lógica específica para a pergunta de graduação (id 4)
            if (q.required && q.id === 4) {
                const answer = answers[q.id];
                if (['Sim', 'Yes', 'Sí', 'sim', 'yes', 'sí'].includes(answer)) {
                    if (!answers[-4] || !answers[-41]) return false;
                }
            }
            return true;
        });
    }, [answers, questions]);

    const scrollToTop = () => {
        setTimeout(() => {
            const element = document.getElementById('survey-top');
            if (element) {
                // Rola suavemente até o container principal do questionário
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    };

    const handleNext = useCallback(() => {
        if (!validateSection()) {
            toast.error(t('selectionSurvey.toastErrorFields'));
            return;
        }

        if (currentSection < sections.length - 1) {
            const nextIndex = currentSection + 1;
            setCurrentSection(nextIndex);
            
            if (!checkSectionComplete(nextIndex)) {
                scrollToTop();
            }
        }
    }, [currentSection, validateSection, sections.length, t, checkSectionComplete]);

    const handleBack = useCallback(() => {
        if (currentSection > 0) {
            const backIndex = currentSection - 1;
            setCurrentSection(backIndex);
            
            if (!checkSectionComplete(backIndex)) {
                scrollToTop();
            }
        }
    }, [currentSection, checkSectionComplete]);

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

    const handleSubmit = useCallback(async () => {
        if (!validateSection()) {
            toast.error(t('selectionSurvey.toastErrorFields'));
            return;
        }

        setIsSaving(true);
        const { score, total, percentage } = calculateScore(answers);
        const passed = percentage >= 80;

        try {
            if (!user) {
                toast.error(t('selectionSurvey.toastErrorAuth'));
                return;
            }

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

            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({ selection_survey_passed: passed })
                .eq('user_id', user.id);

            if (profileError) throw profileError;

            dispatchCacheInvalidationEvent(CacheInvalidationEvent.PROFILE_UPDATED);
            await refetchUserProfile();

            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            console.error('Erro ao salvar questionário:', error);
            toast.error(t('selectionSurvey.toastErrorSave'));
        } finally {
            setIsSaving(false);
        }
    }, [validateSection, answers, extraAnswers, user, userProfile, refetchUserProfile, t]);

    const handleRestart = useCallback(() => {
        clearDraft();
        setAnswers({});
        setExtraAnswers({});
        setErrors({});
        setCurrentSection(0);
        setSubmitted(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [clearDraft]);

    const handleEdit = useCallback(() => {
        setSubmitted(false);
        setCurrentSection(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleFinish = useCallback(() => {
        // Não limpa o draft das respostas ao avançar, para que se o usuário
        // voltar ao passo ainda veja a pontuação correta.
        // clearDraft só é chamado no handleRestart (refazer do zero).
        onNext();
    }, [onNext]);

    const handleSkip = useCallback(async () => {
        if (!isLocalhost) return;

        setIsSaving(true);
        try {
            if (!user) return;

            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({ selection_survey_passed: true })
                .eq('user_id', user.id);

            if (profileError) throw profileError;

            dispatchCacheInvalidationEvent(CacheInvalidationEvent.PROFILE_UPDATED);
            await refetchUserProfile();
            
            toast.success('Questionário pulado (Modo Dev)');
            onNext();
        } catch (error) {
            console.error('Erro ao pular questionário:', error);
            toast.error('Erro ao pular questionário');
        } finally {
            setIsSaving(false);
        }
    }, [isLocalhost, user, refetchUserProfile, onNext]);

    if (submitted) {
        return (
            <div className="w-full">
                <ResultsPage
                    answers={answers}
                    onRestart={handleRestart}
                    onEdit={handleEdit}
                    onFinish={handleFinish}
                />
            </div>
        );
    }


    return (
        <div id="survey-top" className="max-w-4xl mx-auto w-full space-y-8 sm:space-y-10 pb-12">
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="text-left">
                    <h1 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-4 leading-none">
                        {t('selectionSurvey.title')}
                    </h1>
                    <p className="text-slate-600 text-base md:text-lg font-medium max-w-2xl">
                        <Trans
                            i18nKey="selectionSurvey.subtitle"
                            components={[
                                <span key="0" className="!text-blue-600 font-bold" />
                            ]}
                        />
                    </p>
                </div>
                {isLocalhost && (
                    <Button
                        variant="ghost"
                        onClick={handleSkip}
                        disabled={isSaving}
                        className="w-full sm:w-auto h-12 px-6 rounded-xl text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-all border border-slate-200 hover:border-slate-300 shadow-sm"
                    >
                        <FastForward className="w-4 h-4 mr-2" />
                        Pular (Dev)
                    </Button>
                )}
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

                <div className="relative z-10">
                    <ProgressBar 
                        currentSection={currentSection} 
                        completedSections={[]} 
                    />

                    <div className="mt-8 space-y-8 sm:space-y-10">
                        {currentQuestions.map((q) => (
                            <QuestionField
                            key={q.id}
                            question={q}
                            value={answers[q.id]}
                            extraValue={extraAnswers[q.id]}
                            error={errors[q.id]}
                            onChange={(val, customId) => handleAnswer(customId ?? q.id, val)}
                            onExtraChange={(val) => handleExtraAnswer(q.id, val)}
                            answers={answers}
                        />
                    ))}
                </div>

                <div className="mt-12 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-4 w-full sm:w-auto">
                        {currentSection > 0 && (
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="flex-1 sm:flex-none h-14 px-8 rounded-2xl border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 transition-all"
                            >
                                {t('common.back')}
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-4 w-full sm:w-auto">
                        {currentSection < sections.length - 1 ? (
                            <Button
                                onClick={handleNext}
                                className="flex-1 sm:flex-none h-14 px-8 rounded-2xl !bg-blue-600 hover:!bg-blue-700 text-white font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                {t('common.next')}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="flex-1 sm:flex-none h-14 px-8 rounded-2xl !bg-blue-600 hover:!bg-blue-700 text-white font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        {t('common.finish')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};
