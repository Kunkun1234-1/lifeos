"use client";

import { use } from "react";
import { NotesWorkspace } from "@/components/notes/notes-workspace";

type Props = { params: Promise<{ id: string }> };

export default function NoteDetailPage({ params }: Props) {
  const { id } = use(params);
  return <NotesWorkspace initialId={id} />;
}
