import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CodeSquare,
  Heading1, Heading2, Italic, List, ListOrdered, Underline,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Note } from '@/lib/types'
import { unwrapData } from '@/lib/unwrap'

export function RichTextNoteEditor({ note, editable }: { note: Note; editable: boolean }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draft = useRef(note.content ?? '')
  const dirty = useRef(false)
  const revision = useRef(0)
  const save = useMutation({
    // Serialize writes, including a pending save flushed when switching notes.
    scope: { id: `note-content-${note.id}` },
    mutationFn: async (input: { content: string; revision: number }) => {
      return unwrapData(await api<{ data: Note }>(`/api/notes/${note.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: input.content }),
      }))
    },
    onSuccess: (updated, input) => {
      queryClient.setQueryData<Note[]>(['notes'], (notes) => notes?.map((current) =>
        current.id === updated.id
          ? { ...current, content: current.is_locked && !current.is_unlocked ? null : updated.content }
          : current,
      ))
      if (input.revision === revision.current) {
        dirty.current = false
        setStatus('saved')
      }
    },
    onError: (_error, input) => {
      if (input.revision === revision.current) setStatus('error')
    },
  })
  const saveRef = useRef(save.mutate)
  useEffect(() => { saveRef.current = save.mutate }, [save.mutate])

  function flush() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!dirty.current) return
    setStatus('saving')
    saveRef.current({ content: draft.current, revision: revision.current })
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] }, link: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: note.content ?? '',
    editable,
    editorProps: { attributes: { 'aria-label': 'ნოუთის ტექსტი', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: current }) => {
      if (!current.isEditable) return
      draft.current = current.getHTML()
      revision.current += 1
      dirty.current = true
      setStatus('dirty')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, 500)
    },
    onBlur: flush,
  })
  useEditorState({ editor, selector: ({ editor: current }) => current?.state })

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(editable, false)
  }, [editor, editable])

  useEffect(() => {
    if (editor && !editor.isDestroyed && !dirty.current && !save.isPending && editor.getHTML() !== (note.content ?? '<p></p>')) {
      editor.commands.setContent(note.content ?? '', { emitUpdate: false })
    }
  }, [editor, note.content, save.isPending])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (timer.current) {
        clearTimeout(timer.current)
        saveRef.current({ content: draft.current, revision: revision.current })
      }
    }
  }, [])

  if (!editor || editor.isDestroyed) return null

  const controls = [
    { label: 'გამუქება', Icon: Bold, active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { label: 'დახრა', Icon: Italic, active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { label: 'ხაზგასმა', Icon: Underline, active: editor.isActive('underline'), run: () => editor.chain().focus().toggleUnderline().run() },
    { label: 'სათაური 1', Icon: Heading1, active: editor.isActive('heading', { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'სათაური 2', Icon: Heading2, active: editor.isActive('heading', { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'მარკირებული სია', Icon: List, active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'დანომრილი სია', Icon: ListOrdered, active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'კოდის ბლოკი', Icon: CodeSquare, active: editor.isActive('codeBlock'), run: () => editor.chain().focus().toggleCodeBlock().run() },
    ...([
      { align: 'left', label: 'მარცხნივ', Icon: AlignLeft },
      { align: 'center', label: 'ცენტრში', Icon: AlignCenter },
      { align: 'right', label: 'მარჯვნივ', Icon: AlignRight },
      { align: 'justify', label: 'ორივე მხარეს', Icon: AlignJustify },
    ] as const).map(({ align, label, Icon }) => ({
      label, Icon, active: editor.isActive({ textAlign: align }),
      run: () => editor.chain().focus().setTextAlign(align).run(),
    })),
  ]

  return (
    <section className="rich-note">
      {editable && <div className="rich-note-toolbar" role="group" aria-label="ტექსტის ფორმატირება">
        {controls.map(({ label, Icon, active, run }) => (
          <button key={label} type="button" className={`btn-icon ${active ? 'active' : ''}`}
            title={label} aria-label={label} aria-pressed={active}
            onMouseDown={(event) => event.preventDefault()} onClick={run}>
            <Icon size={17} />
          </button>
        ))}
      </div>}
      <EditorContent editor={editor} className="rich-note-content" />
      {editable && <div className="rich-note-status muted" role="status">
        {status === 'error' ? <>
          შენახვა ვერ მოხერხდა. <button type="button" className="btn-ghost" onClick={flush}>ხელახლა ცდა</button>
        </> : status === 'saved' ? 'შენახულია' : status === 'saving' ? 'ინახება…' : 'ცვლილებები შესანახია…'}
      </div>}
    </section>
  )
}
