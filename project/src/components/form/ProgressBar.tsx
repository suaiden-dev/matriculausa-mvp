import { sections } from '@/data/formQuestions';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTranslation } from 'react-i18next';

interface ProgressBarProps {
    currentSection: number;
    completedSections: number[];
}

const ProgressBar = ({ currentSection, completedSections }: ProgressBarProps) => {
    const { t } = useTranslation();

    return (
        <div className="w-full">
            {/* Mobile: simple progress bar */}
            <div className="md:hidden mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                        {t('common.section')} {currentSection + 1} {t('common.of')} {sections.length}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {t(sections[currentSection]?.title)}
                    </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Desktop: step indicators */}
            <div className="hidden md:flex items-center justify-between mb-8">
                {sections.map((section, index) => {
                    const isDone = completedSections.includes(index);
                    const isActive = index === currentSection;
                    const isPending = !isDone && !isActive;

                    return (
                        <div key={section.key} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                                        isDone && 'bg-blue-600 text-white',
                                        isActive && 'bg-blue-600 text-white ring-4 ring-blue-600/20',
                                        isPending && 'bg-slate-200 text-slate-500'
                                    )}
                                >
                                    {isDone ? <Check className="w-5 h-5" /> : section.key}
                                </div>
                                <span
                                    className={cn(
                                        'text-xs mt-2 text-center max-w-[100px] leading-tight',
                                        isActive && 'text-blue-600 font-semibold',
                                        isDone && 'text-blue-600',
                                        isPending && 'text-slate-500'
                                    )}
                                >
                                    {t(section.title)}
                                </span>
                            </div>
                            {index < sections.length - 1 && (
                                <div
                                    className={cn(
                                        'flex-1 h-0.5 mx-2 mt-[-20px]',
                                        isDone ? 'bg-blue-600' : 'bg-slate-200'
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressBar;
