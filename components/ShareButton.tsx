import React, { useState, useRef, useEffect } from 'react';
import { Share2, Copy, Twitter, Facebook, Check } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ title, text, url = window.location.href, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (error) {
        // User cancelled or error, fallback to dropdown if desired, 
        // but usually we just let the native sheet handle it.
        // If it throws "AbortError" (user cancelled), we ignore.
        console.debug('Share API error or cancelled:', error);
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  const copyToClipboard = () => {
    const shareText = `${text}\n${url}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsOpen(false);
    }, 2000);
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
    setIsOpen(false);
  };

  const shareToFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(fbUrl, '_blank');
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button 
        onClick={handleShare}
        className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
        aria-label="Share"
      >
        <Share2 size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
          <div className="p-1 space-y-0.5">
             <button onClick={shareToTwitter} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left group">
              <Twitter size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Twitter</span>
            </button>
            <button onClick={shareToFacebook} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left group">
              <Facebook size={16} className="text-blue-700 group-hover:scale-110 transition-transform" />
              <span>Facebook</span>
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={copyToClipboard} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left group">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-400 group-hover:text-slate-600" />}
              <span>{copied ? 'Copied!' : 'Copy Info'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;