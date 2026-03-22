'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star } from 'lucide-react';
import { saveFeedback } from '@/services/feedback-service';
import { useAuth } from '@/contexts/auth-context';

interface FeedbackComponentProps {
  queryId: string;
  section: 'laws' | 'precedents' | 'checklist' | 'overall';
  label: string;
}

export function FeedbackComponent({ queryId, section, label }: FeedbackComponentProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentField, setShowCommentField] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleRatingClick = (value: number) => {
    setRating(value);
    setShowCommentField(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to provide feedback.',
        variant: 'destructive',
      });
      return;
    }

    if (rating === null) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await saveFeedback({
        queryId,
        userId: user.uid,
        section,
        rating,
        comments: comment.trim() || undefined,
      });

      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!',
      });

      // Reset form
      setRating(null);
      setComment('');
      setShowCommentField(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <p className="text-xs font-medium mb-1">{label}</p>
      <div className="flex items-center space-x-1 mb-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleRatingClick(value)}
            className="focus:outline-none"
          >
            <Star
              size={16}
              className={`${rating && rating >= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>

      {showCommentField && (
        <div className="space-y-2">
          <Textarea
            placeholder="Additional comments (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="text-xs min-h-[60px]"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-xs"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      )}
    </div>
  );
}