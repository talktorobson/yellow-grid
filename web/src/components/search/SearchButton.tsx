/**
 * Search Button Component
 * Triggers the advanced search modal
 */

import { useState } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import AdvancedSearchModal from './AdvancedSearchModal';

interface SearchButtonProps {
  className?: string;
}

export default function SearchButton({ className }: SearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          'relative p-2 hover:bg-gray-100 rounded-lg transition-colors',
          className
        )}
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-gray-600" />
      </button>

      <AdvancedSearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
