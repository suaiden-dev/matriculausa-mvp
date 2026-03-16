import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { questions, sections } from '../../data/formQuestions';
import { CheckCircle, XCircle, FileText, Calendar, Award, ChevronDown, ChevronRight, ListChecks } from 'lucide-react';

interface SelectionSurveyViewProps {
    userId: string;
    surveyPassed?: boolean;
}

interface Submission {
    id: string;
    user_id: string;
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    answers: Record<string, string>;
    extra_answers: Record<string, string>;
    created_at: string;
    updated_at: string;
}

const SelectionSurveyView: React.FC<SelectionSurveyViewProps> = ({ userId, surveyPassed }) => {
    const { t } = useTranslation();
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (error) throw error;
                setSubmission(data);

                // Initialize first section as expanded
                if (data && sections.length > 0) {
                    setExpandedSections({ [sections[0].key]: true });
                }
            } catch (error) {
                console.error('Error fetching survey submission:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchSubmission();
        }
    }, [userId]);

    const toggleSection = (sectionKey: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
        }));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Survey Submission Found</h3>
                {surveyPassed && (
                    <div className="mb-4 inline-flex items-center px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-bold border-2 border-green-200">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        STUDENT PASSED SURVEY
                    </div>
                )}
                <p className="text-slate-500 max-w-md mx-auto">
                    {surveyPassed 
                        ? "This student passed the Selection Survey during onboarding, but the detailed answers are not available in the database." 
                        : "This student has not completed the Selection Survey yet."}
                </p>
            </div>
        );
    }

    const getAnswerLabel = (questionId: number, answerValue: string) => {
        const question = questions.find(q => q.id === questionId);
        if (!question) return answerValue;

        if (question.options) {
            const option = (question.options as unknown as any[]).find(o => o.value === answerValue);
            return option ? t(option.label) : answerValue;
        }

        if (question.type === 'yesno') {
            return answerValue === 'Sim' ? 'Yes' : (answerValue === 'Não' ? 'No' : answerValue);
        }

        if (question.type === 'truefalse') {
            const option = (question.options as unknown as any[])?.find(o => o.value === answerValue);
            return option ? t(option.label) : answerValue;
        }

        return answerValue;
    };

    const isCorrect = (questionId: number, answerValue: string) => {
        const question = questions.find(q => q.id === questionId);
        if (!question || !question.scored || !question.options) return null;
        const option = (question.options as unknown as any[]).find(o => o.value === answerValue);
        return option?.correct === true;
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className={`px-6 py-4 ${submission.passed ? 'bg-gradient-to-r from-[#05294E] to-[#0A4A8B]' : 'bg-gradient-to-r from-red-700 to-red-800'}`}>
                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Resumo do Questionário</h2>
                                <p className="text-white/70 text-sm">Atualizado em {new Date(submission.updated_at || submission.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${submission.passed ? 'bg-green-500/20 border-green-400 text-green-100' : 'bg-red-500/20 border-red-400 text-red-100'}`}>
                            {submission.passed ? 'APROVADO' : 'REPROVADO'}
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pontuação</p>
                        <p className="text-2xl font-black text-[#05294E]">{submission.score} <span className="text-lg font-normal text-slate-400">/ {submission.total}</span></p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Percentual</p>
                        <p className={`text-2xl font-black ${submission.passed ? 'text-green-600' : 'text-red-600'}`}>{submission.percentage}%</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                        <div className="flex items-center gap-2">
                            {submission.passed ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                            <span className="font-bold text-slate-700">{submission.passed ? 'Aprovado' : 'Revisar'}</span>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data</p>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <span className="font-bold text-slate-700">{new Date(submission.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions Detail with Accordion */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <ListChecks className="w-5 h-5 mr-2 text-[#05294E]" />
                        Detalhamento das Respostas
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const allOpen = sections.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});
                                setExpandedSections(allOpen);
                            }}
                            className="text-xs font-medium text-[#05294E] hover:underline"
                        >
                            Expandir tudo
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                            onClick={() => setExpandedSections({})}
                            className="text-xs font-medium text-slate-500 hover:underline"
                        >
                            Recolher tudo
                        </button>
                    </div>
                </div>

                {sections.map((section) => {
                    const isExpanded = !!expandedSections[section.key];
                    const sectionQuestions = questions.filter(q => q.section === section.key);
                    const answeredCount = sectionQuestions.filter(q => submission.answers[String(q.id)]).length;

                    if (answeredCount === 0) return null;

                    return (
                        <div key={section.key} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200">
                            {/* Section Header (Clickable) */}
                            <button
                                onClick={() => toggleSection(section.key)}
                                className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isExpanded ? 'bg-white shadow-sm text-[#05294E]' : 'bg-slate-100 text-slate-500'}`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t(section.title)}</h4>
                                        <p className="text-xs text-slate-500">{answeredCount} perguntas respondidas</p>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            </button>

                            {/* Section Content */}
                            {isExpanded && (
                                <div className="p-6 space-y-6 bg-white">
                                    <div className="grid grid-cols-1 gap-6">
                                        {sectionQuestions.map(question => {
                                            const answer = submission.answers[String(question.id)];
                                            if (!answer) return null;

                                            const correct = isCorrect(question.id, answer);
                                            const extraAnswer = submission.extra_answers?.[String(question.id)];

                                            return (
                                                <div key={question.id} className="relative pl-6 border-l-2 border-slate-100 hover:border-[#05294E]/30 transition-colors">
                                                    <div className="absolute -left-[9px] top-1">
                                                        <div className={`w-4 h-4 rounded-full border-2 bg-white ${question.scored ? (correct ? 'border-green-500' : 'border-red-500') : 'border-slate-300'}`}></div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questão {question.id}</span>
                                                            {question.scored && (
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {correct ? 'CORRETA' : 'INCORRETA'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="text-slate-900 font-bold leading-relaxed">{t(question.text)}</p>

                                                        <div className="mt-1 flex flex-col gap-2">
                                                            <div className={`px-4 py-3 rounded-xl border ${correct === false ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Resposta do Aluno</span>
                                                                <p className="text-slate-800 font-medium">{getAnswerLabel(question.id, answer)}</p>
                                                            </div>

                                                            {extraAnswer && (
                                                                <div className="px-4 py-3 rounded-xl bg-blue-50/30 border border-blue-100/50">
                                                                    <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Informações Adicionais</span>
                                                                    <p className="text-slate-700 text-sm italic">"{extraAnswer}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="text-center py-8">
                <p className="text-xs text-slate-400">Fim do relatório de questionário de alinhamento.</p>
            </div>
        </div>
    );
};

export default SelectionSurveyView;
