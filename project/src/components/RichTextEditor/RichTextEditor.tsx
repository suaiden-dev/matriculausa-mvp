import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import DOMPurify from 'dompurify';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    Type,
    Eraser,
    Heading1,
    Heading2,
    Heading3,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Quote,
    Minus,
    Link as LinkIcon,
    Grid,
    PlusSquare,
    Rows,
    Undo,
    Redo,
    Code,
    FileEdit,
    RotateCcw
} from 'lucide-react';
import ToolbarButton from './ToolbarButton';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    content,
    onChange,
    placeholder = 'Start typing...',
    className = '',
}) => {
    const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
    const [isFocused, setIsFocused] = useState(false);
    const [originalHtml, setOriginalHtml] = useState(content);
    const [rawHtml, setRawHtml] = useState(content);

    const editor = useEditor({
        content: content,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline cursor-pointer',
                },
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse table-fixed w-full my-4 border border-slate-200',
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            Placeholder.configure({
                placeholder: placeholder,
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] p-8 md:p-12',
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            setRawHtml(html);
            onChange(html);
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => setIsFocused(false),
    });

    // Backup original content when it first arrives
    useEffect(() => {
        if (!originalHtml && content) {
            setOriginalHtml(content);
        }
    }, [content, originalHtml]);

    // Sync external changes to editor
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
            setRawHtml(content);
        }
    }, [content, editor]);

    // Sync Raw HTML with Editor when switching back to visual
    useEffect(() => {
        if (viewMode === 'visual' && editor) {
            const sanitized = DOMPurify.sanitize(rawHtml);
            if (sanitized !== editor.getHTML()) {
                editor.commands.setContent(sanitized);
            }
        }
    }, [viewMode, editor, rawHtml]);

    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', previousUrl);

        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const restoreOriginal = useCallback(() => {
        if (window.confirm('Do you want to restore the original version? Current changes will be lost.')) {
            if (editor) {
                editor.commands.setContent(originalHtml);
            }
            setRawHtml(originalHtml);
            onChange(originalHtml);
        }
    }, [editor, originalHtml, onChange]);

    // Truncation Logic (Safety Feature)
    const isTruncated = useMemo(() => {
        if (!originalHtml || rawHtml.length === 0) return false;
        // Warning if content lost more than 60% of size (potential accidental deletion)
        return rawHtml.length < (originalHtml.length * 0.4);
    }, [originalHtml, rawHtml]);

    if (!editor) {
        return (
            <div className="w-full h-96 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div
            className={`
        flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white transition-all shadow-sm
        ${isFocused ? 'ring-2 ring-blue-500/20 border-blue-500/50' : ''}
        ${className}
      `}
        >
            {/* Toolbar */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 p-2 flex flex-wrap items-center gap-1 shadow-sm backdrop-blur-sm">
                {/* View Toggle */}
                <div className="flex items-center bg-slate-200/50 p-1 rounded-xl mr-2">
                    <button
                        type="button"
                        onClick={() => setViewMode('visual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'visual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileEdit className="h-3 w-3" />
                        Visual
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('code')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'code' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Code className="h-3 w-3" />
                        Code
                    </button>
                </div>

                {viewMode === 'visual' && (
                    <>
                        {/* Marks */}
                        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 mr-1">
                            <ToolbarButton icon={Bold} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
                            <ToolbarButton icon={Italic} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
                            <ToolbarButton icon={UnderlineIcon} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} />
                            <ToolbarButton icon={Strikethrough} title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} />
                        </div>

                        {/* Colors & Marks */}
                        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 mr-1">
                            <ToolbarButton icon={Highlighter} title="Highlight" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} active={editor.isActive('highlight', { color: '#fef08a' })} />
                            <ToolbarButton icon={Type} title="Primary Color" onClick={() => editor.chain().focus().setColor('#2563eb').run()} active={editor.isActive('textStyle', { color: '#2563eb' })} />
                            <ToolbarButton icon={Eraser} title="Clear Formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />
                        </div>

                        {/* Headings */}
                        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 mr-1">
                            <ToolbarButton icon={Heading1} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} />
                            <ToolbarButton icon={Heading2} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} />
                            <ToolbarButton icon={Heading3} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} />
                        </div>

                        {/* Alignment */}
                        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 mr-1">
                            <ToolbarButton icon={AlignLeft} title="Align Left" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} />
                            <ToolbarButton icon={AlignCenter} title="Align Center" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} />
                            <ToolbarButton icon={AlignRight} title="Align Right" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} />
                            <ToolbarButton icon={AlignJustify} title="Align Justify" onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} />
                        </div>

                        {/* Lists & Structural */}
                        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 mr-1">
                            <ToolbarButton icon={List} title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
                            <ToolbarButton icon={ListOrdered} title="Ordered List" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
                            <ToolbarButton icon={Quote} title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} />
                            <ToolbarButton icon={Minus} title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
                            <ToolbarButton icon={LinkIcon} title="Link" onClick={setLink} active={editor.isActive('link')} />
                        </div>

                        {/* Tables */}
                        <div className="flex items-center gap-0.5 px-1">
                            <ToolbarButton icon={Grid} title="Insert Table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
                            {editor.isActive('table') && (
                                <>
                                    <ToolbarButton icon={PlusSquare} title="Add Row After" onClick={() => editor.chain().focus().addRowAfter().run()} />
                                    <ToolbarButton icon={Rows} title="Delete Table" onClick={() => editor.chain().focus().deleteTable().run()} />
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* Undo/Redo - Always visible */}
                <div className="ml-auto flex items-center gap-1">
                    <ToolbarButton icon={Undo} title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
                    <ToolbarButton icon={Redo} title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
                </div>
            </div>

            {/* Editor Content Area */}
            <div className="relative flex-1 bg-slate-100 overflow-y-auto min-h-[500px]">
                {viewMode === 'visual' ? (
                    <div className="max-w-[900px] mx-auto my-12 bg-white border border-slate-200 shadow-xl min-h-[800px]">
                        <EditorContent editor={editor} />
                    </div>
                ) : (
                    <textarea
                        value={rawHtml}
                        onChange={(e) => {
                            setRawHtml(e.target.value);
                            onChange(e.target.value);
                        }}
                        className="w-full h-full min-h-[800px] p-8 md:p-12 bg-slate-900 text-blue-400 font-mono text-sm border-none focus:ring-0 resize-none outline-none leading-relaxed"
                        placeholder="Type your HTML here..."
                        spellCheck={false}
                    />
                )}
            </div>

            {/* Status Bar */}
            <div className="p-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isTruncated ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className={isTruncated ? 'text-red-500' : ''}>
                            {isTruncated ? 'Warning: Content may be truncated' : 'Integrity: OK'}
                        </span>
                    </div>
                    <div>Size: <span className="text-slate-600">{(rawHtml.length / 1024).toFixed(2)} KB</span></div>
                </div>

                <div className="flex items-center gap-3">
                    {originalHtml !== rawHtml && (
                        <button
                            type="button"
                            onClick={restoreOriginal}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-all border border-orange-200"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Restore Original
                        </button>
                    )}
                    <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                        Tiptap Editor React
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RichTextEditor;
