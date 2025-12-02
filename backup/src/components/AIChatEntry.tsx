import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import AIChatModal from './AIChatModal';

interface AIConfig {
  enabled: boolean;
  apiUrl: string;
  hasApiKey: boolean;
}

const AIChatEntry = () => {
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const fetchAIConfig = async () => {
      try {
        const response = await fetch('/api/ai/config');
        if (response.ok) {
          const config = await response.json();
          setAiConfig(config);
        }
      } catch (error) {
        console.error('Failed to fetch AI config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAIConfig();

    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (loading || !aiConfig || !aiConfig.enabled || !aiConfig.apiUrl || !aiConfig.hasApiKey) {
    return null;
  }

  const handleIconClick = () => {
    if (isDesktop) {
      setIsModalOpen(true);
    } else {
      // On mobile, the Link component will handle navigation
    }
  };

  const commonIcon = (
    <div
      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
      title="AI推荐影片"
      onClick={handleIconClick}
    >
      <Bot className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    </div>
  );

  return (
    <>
      {isDesktop ? (
        commonIcon
      ) : (
        <Link href="/ai-chat">
          {commonIcon}
        </Link>
      )}
      {isDesktop && <AIChatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default AIChatEntry;
