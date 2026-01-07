/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import { DoubanDetail, SearchResult } from '@/lib/types';

import CombinedDetailModal from './CombinedDetailModal';

interface VideoCardModalProps {
  isVisible: boolean;
  isLoading: boolean;
  doubanDetail: DoubanDetail | null;
  videoDetail: SearchResult | null;
  poster?: string;
  title?: string;
  onClose: () => void;
  onPlay: () => void;
  onClearAutoPlayTimer: () => void;
}

const VideoCardModal = React.memo(function VideoCardModal({
  isVisible,
  isLoading,
  doubanDetail,
  videoDetail,
  poster,
  title,
  onClose,
  onPlay,
  onClearAutoPlayTimer,
}: VideoCardModalProps) {
  return (
    <>
      <CombinedDetailModal
        isOpen={isVisible}
        onClose={onClose}
        onPlay={onPlay}
        onClearAutoPlayTimer={onClearAutoPlayTimer}
        doubanDetail={doubanDetail}
        videoDetail={videoDetail}
        isLoading={isLoading}
        poster={poster || ''}
        title={title || ''}
      />
    </>
  );
});

export default VideoCardModal;