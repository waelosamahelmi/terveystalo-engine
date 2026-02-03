// ============================================================================
// SUUN TERVEYSTALO - Comments Component
// Team comments for campaigns, analytics, and creatives
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { format, formatDistanceToNow } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  MessageSquare,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  Reply,
  Heart,
  AtSign,
  Smile,
  Paperclip,
  X,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  parent_id?: string;
  mentions?: string[];
  reactions?: Record<string, string[]>;
  edited_at?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image_url?: string;
  };
  replies?: Comment[];
}

interface CommentsProps {
  entityType: 'campaign' | 'analytics' | 'creative' | 'branch';
  entityId: string;
  compact?: boolean;
}

const Comments = ({ entityType, entityId, compact = false }: CommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showAllComments, setShowAllComments] = useState(!compact);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user, users } = useStore();

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_type=eq.${entityType}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityType, entityId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users(id, name, email, image_url)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              user:users(id, name, email, image_url)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          return { ...comment, replies: replies || [] };
        })
      );

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim() || !user) return;

    setSending(true);
    try {
      // Extract mentions
      const mentionRegex = /@(\w+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]);
      }

      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          content: content.trim(),
          parent_id: parentId || null,
          mentions: mentions.length > 0 ? mentions : null
        });

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'comment',
        entity_type: entityType,
        entity_id: entityId,
        details: { content: content.substring(0, 100) }
      });

      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }

      toast.success('Kommentti lisätty');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Kommentin lisääminen epäonnistui');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: editContent.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingId(null);
      setEditContent('');
      toast.success('Kommentti päivitetty');
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('Kommentin muokkaus epäonnistui');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän kommentin?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Kommentti poistettu');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Kommentin poistaminen epäonnistui');
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!user) return;

    try {
      const comment = comments.find(c => c.id === commentId);
      const reactions = comment?.reactions || {};
      const currentReactions = reactions[emoji] || [];

      let newReactions: Record<string, string[]>;
      if (currentReactions.includes(user.id)) {
        // Remove reaction
        newReactions = {
          ...reactions,
          [emoji]: currentReactions.filter(id => id !== user.id)
        };
      } else {
        // Add reaction
        newReactions = {
          ...reactions,
          [emoji]: [...currentReactions, user.id]
        };
      }

      const { error } = await supabase
        .from('comments')
        .update({ reactions: newReactions })
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const isOwner = user?.id === comment.user_id;
    const isEditing = editingId === comment.id;

    return (
      <div className={`group ${isReply ? 'ml-12 mt-3' : ''}`}>
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          {comment.user?.image_url ? (
            <img 
              src={comment.user.image_url} 
              alt={comment.user.name}
              className={`rounded-full object-cover ${isReply ? 'w-8 h-8' : 'w-10 h-10'}`}
            />
          ) : (
            <div className={`rounded-full bg-gradient-to-br from-[#00A5B5] to-[#1B365D] flex items-center justify-center text-white font-medium ${isReply ? 'w-8 h-8 text-sm' : 'w-10 h-10'}`}>
              {(comment.user?.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 text-sm">
                  {comment.user?.name || 'Käyttäjä'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fi })}
                </span>
                {comment.edited_at && (
                  <span className="text-xs text-gray-400">(muokattu)</span>
                )}
              </div>

              {/* Actions Menu */}
              {isOwner && (
                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setMenuOpen(menuOpen === comment.id ? null : comment.id)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical size={14} className="text-gray-400" />
                  </button>

                  {menuOpen === comment.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit size={14} className="mr-2" />
                          Muokkaa
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(comment.id);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Poista
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent text-sm resize-none"
                  rows={2}
                />
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => handleEdit(comment.id)}
                    className="btn-primary btn-sm"
                  >
                    Tallenna
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditContent('');
                    }}
                    className="btn-ghost btn-sm"
                  >
                    Peruuta
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                {comment.content}
              </p>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center space-x-4 mt-2">
                <button
                  onClick={() => handleReaction(comment.id, '❤️')}
                  className={`flex items-center space-x-1 text-xs ${
                    comment.reactions?.['❤️']?.includes(user?.id || '')
                      ? 'text-red-500'
                      : 'text-gray-400 hover:text-red-500'
                  } transition-colors`}
                >
                  <Heart size={14} fill={comment.reactions?.['❤️']?.includes(user?.id || '') ? 'currentColor' : 'none'} />
                  {comment.reactions?.['❤️']?.length > 0 && (
                    <span>{comment.reactions['❤️'].length}</span>
                  )}
                </button>

                {!isReply && (
                  <button
                    onClick={() => {
                      setReplyingTo(comment.id);
                      setReplyContent('');
                    }}
                    className="flex items-center space-x-1 text-xs text-gray-400 hover:text-[#00A5B5] transition-colors"
                  >
                    <Reply size={14} />
                    <span>Vastaa</span>
                  </button>
                )}
              </div>
            )}

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div className="mt-3 flex items-start space-x-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Kirjoita vastaus..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent text-sm resize-none"
                  rows={2}
                />
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => handleSubmit(comment.id)}
                    disabled={!replyContent.trim() || sending}
                    className="p-2 bg-[#00A5B5] text-white rounded-lg hover:bg-[#008a97] disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 space-y-3">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <div className={compact ? '' : 'card'}>
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-4' : 'px-6 py-4 border-b border-gray-100'}`}>
        <div className="flex items-center space-x-2">
          <MessageSquare size={18} className="text-[#00A5B5]" />
          <h3 className="font-semibold text-gray-900">Kommentit</h3>
          {comments.length > 0 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {comments.length}
            </span>
          )}
        </div>
      </div>

      {/* New Comment Input */}
      <div className={compact ? 'mb-4' : 'px-6 py-4 border-b border-gray-100'}>
        <div className="flex items-start space-x-3">
          {user?.image_url ? (
            <img 
              src={user.image_url} 
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A5B5] to-[#1B365D] flex items-center justify-center text-white font-medium">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Lisää kommentti... Käytä @käyttäjänimi mainitaksesi jonkun"
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#00A5B5] focus:bg-white transition-all text-sm resize-none placeholder-gray-400"
              rows={2}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <AtSign size={16} />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Smile size={16} />
                </button>
              </div>
              <button
                onClick={() => handleSubmit()}
                disabled={!newComment.trim() || sending}
                className="btn-primary btn-sm"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin mr-1" />
                ) : (
                  <Send size={16} className="mr-1" />
                )}
                Lähetä
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className={compact ? '' : 'px-6 py-4'}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Ei kommentteja vielä</p>
            <p className="text-sm text-gray-400 mt-1">Ole ensimmäinen kommentoija!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}

            {compact && comments.length > 3 && (
              <button
                onClick={() => setShowAllComments(!showAllComments)}
                className="flex items-center space-x-1 text-sm text-[#00A5B5] hover:underline"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp size={16} />
                    <span>Näytä vähemmän</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    <span>Näytä kaikki {comments.length} kommenttia</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;
