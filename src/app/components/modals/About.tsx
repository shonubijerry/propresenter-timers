'use client'

import Modal from './Modal'
import tauriConfig from '../../../../tauri/tauri.conf.json'
import { BsGithub } from 'react-icons/bs'

interface AboutProps {
  open: boolean
  onClose: () => void
}

export default function About({ open, onClose }: AboutProps) {
  const { version, productName, identifier } = tauriConfig ?? {}

  return (
    <Modal open={open} onClose={onClose} title=''>
      <div className='flex flex-col items-center text-center space-y-5 p-4'>
        <div className='flex flex-col items-center space-y-2'>
          <div className='bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl'>
            <div className='bg-white dark:bg-gray-800 rounded-2xl px-5 py-3 shadow-sm'>
              <h1 className='text-xl font-semibold text-gray-800 dark:text-gray-100'>
                {productName || 'My Tauri App'}
              </h1>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {identifier || 'com.example.app'}
              </p>
            </div>
          </div>

          <div className='text-sm text-gray-600 dark:text-gray-600 mt-2'>
            <p>
              Amazing Grace Timer Control is a lightweight, fast desktop application built with{' '}
              <strong>Tauri</strong> and <strong>Next.js</strong>.
            </p>
          </div>
        </div>

        <div className='text-sm text-gray-500 dark:text-gray-600 pt-3 border-t border-gray-200 dark:border-gray-700 w-full mb-4'>
          <p>
            <span className='font-medium text-gray-700 dark:text-gray-600'>
              Version:
            </span>{' '}
            {version || 'Unknown'}
          </p>
        </div>

        <a
          href="https://github.com/shonubijerry/propresenter-timers"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <BsGithub className="w-4 h-4 text-gray-400 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
            View on GitHub
          </span>
        </a>
      </div>
    </Modal>
  )
}
