'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

interface SongRequest {
  id: string;
  songTitle: string;
  artistName: string;
  albumArt?: string | null;
  requesterName?: string | null;
  message?: string | null;
  tipCents: number;
  bpm?: number | null;
  musicalKey?: string | null;
  status: string;
  createdAt: string | Date;
}

function RequestCard({
  request,
  onStatus,
  onDelete,
}: {
  request: SongRequest;
  onStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: request.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zM16 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {request.albumArt && (
        <img src={request.albumArt} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{request.songTitle}</p>
        <p className="text-zinc-400 text-xs truncate">{request.artistName}</p>
        {(request.bpm || request.musicalKey) && (
          <div className="flex items-center gap-2 mt-0.5">
            {request.bpm && (
              <span className="text-zinc-500 text-xs">{request.bpm} BPM</span>
            )}
            {request.bpm && request.musicalKey && (
              <span className="text-zinc-700 text-xs">·</span>
            )}
            {request.musicalKey && (
              <span className="text-zinc-500 text-xs">{request.musicalKey}</span>
            )}
          </div>
        )}
        {request.requesterName && (
          <p className="text-zinc-500 text-xs">from {request.requesterName}</p>
        )}
        {request.message && (
          <p className="text-zinc-500 text-xs italic truncate">&ldquo;{request.message}&rdquo;</p>
        )}
      </div>

      {request.tipCents > 0 ? (
        <span className="flex items-center gap-1 bg-violet-500/15 text-violet-300 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 border border-violet-500/20">
          💰 ${(request.tipCents / 100).toFixed(2)}
        </span>
      ) : (
        <span className="text-zinc-700 text-xs px-2.5 py-1 flex-shrink-0">No tip</span>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        {request.status === 'PENDING' && (
          <button
            onClick={() => onStatus(request.id, 'PLAYING')}
            className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
            title="Mark playing"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
          </button>
        )}
        {request.status === 'PLAYING' && (
          <button
            onClick={() => onStatus(request.id, 'PLAYED')}
            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
            title="Mark played"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(request.id)}
          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Remove"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function QueueManager({
  eventId,
  initialRequests,
}: {
  eventId: string;
  initialRequests: SongRequest[];
}) {
  const [requests, setRequests] = useState<SongRequest[]>(initialRequests);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/sse/${eventId}`);
    es.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === 'new_request') {
        setRequests(prev => [...prev, payload.request]);
      } else if (payload.type === 'update_request') {
        setRequests(prev =>
          prev
            .map(r => r.id === payload.request.id ? payload.request : r)
            .filter(r => r.status === 'PENDING' || r.status === 'PLAYING')
        );
      } else if (payload.type === 'delete_request') {
        setRequests(prev => prev.filter(r => r.id !== payload.requestId));
      }
    };
    return () => es.close();
  }, [eventId]);

  async function handleStatus(id: string, status: string) {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error('Failed to update status'); return; }
    if (status === 'PLAYED' || status === 'REJECTED') {
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/requests/${id}`, { method: 'DELETE' });
    setRequests(prev => prev.filter(r => r.id !== id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = requests.findIndex(r => r.id === active.id);
    const newIndex = requests.findIndex(r => r.id === over.id);
    const reordered = arrayMove(requests, oldIndex, newIndex);
    setRequests(reordered);

    // Persist positions
    await Promise.all(
      reordered.map((r, i) =>
        fetch(`/api/requests/${r.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: i }),
        })
      )
    );
  }

  const pending = requests.filter(r => r.status === 'PENDING');
  const playing = requests.filter(r => r.status === 'PLAYING');
  const totalTipCents = requests.reduce((sum, r) => sum + r.tipCents, 0);
  const tippedCount = requests.filter(r => r.tipCents > 0).length;

  return (
    <div className="space-y-4">
      {totalTipCents > 0 && (
        <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-violet-300 font-bold text-lg">${(totalTipCents / 100).toFixed(2)} in tips</p>
            <p className="text-zinc-400 text-xs">{tippedCount} tipped request{tippedCount !== 1 ? 's' : ''} in queue</p>
          </div>
        </div>
      )}
      {playing.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Now Playing</h3>
          <div className="space-y-2">
            {playing.map(r => (
              <RequestCard key={r.id} request={r} onStatus={handleStatus} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Queue ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="text-center py-10 bg-zinc-900 border border-zinc-800 border-dashed rounded-xl">
            <p className="text-zinc-500 text-sm">No requests yet. Share your link to get started.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pending.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {pending.map(r => (
                  <RequestCard key={r.id} request={r} onStatus={handleStatus} onDelete={handleDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

