import Image from 'next/image'
import React, { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import deepmerge from 'deepmerge'

import { Wallet } from '@/components/Wallet'
import { Activity } from '@/components/Activity/Activity'
import PoolsPage from '@/pages/pools'
import Bridge from '@/pages/state-managed-bridge'
import Swap from '@/pages/swap'
import { SYN } from '@/constants/tokens/bridgeable'
import { Pane } from '@/components/Terminal/Pane'
import { Portfolio } from '@/components/Portfolio/Portfolio'

export async function getStaticProps({ locale }) {
  const userMessages = (await import(`../../messages/${locale}.json`)).default
  const defaultMessages = (await import(`../../messages/en-US.json`)).default
  const messages = deepmerge(defaultMessages, userMessages)

  return {
    props: {
      messages,
    },
  }
}

export default () => {
  const allOptions = [
    {
      key: '01',
      title: 'Bridge',
      content: <Bridge />,
    },
    {
      key: '02',
      title: 'Swap',
      content: <Swap />,
    },
    {
      key: '03',
      title: 'Pools',
      content: (
        <div className="flex flex-col">
          <div className="text-cortex-yellow">Your Pools</div>
          <PoolsPage />
        </div>
      ),
    },
    { key: '04', title: 'Portfolio', content: <Portfolio /> },
    { key: '05', title: 'Activity', content: <Activity visibility={true} /> },
  ]
  const [selectedOptions, setSelectedOptions] = useState([
    allOptions.find((option) => option.key === '01'),
  ])
  const inputRef = useRef<HTMLInputElement>(null)

  const onAdd = (key: string) => {
    setSelectedOptions((prevOptions) =>
      prevOptions.some((option) => option.key === key)
        ? prevOptions
        : [...prevOptions, allOptions.find((option) => option.key === key)]
    )
  }
  const onRemove = (key: string) => {
    setSelectedOptions((prevOptions) =>
      prevOptions.filter((option) => option.key !== key)
    )
  }

  return (
    <main
      className={`
          dark
          bg-cortex-shade
          flex flex-col
          h-svh md:h-screen sm:max-h-[1280px]
          place-content-between
          p-2 sm:p-12 md:gap-16
        `}
    >
      <div className="flex flex-col h-full gap-2 lg:flex-row gap-x-4 min-h-fit">
        <InteractiveTerminal
          inputRef={inputRef}
          isTerminalActive={true}
          onAdd={onAdd}
          allOptions={allOptions}
        />

        {selectedOptions.map((option) => (
          <Pane
            key={option.key}
            header={option.title}
            content={option.content}
            onRemove={() => onRemove(option.key)}
            isSelected={true}
            initialPosition={{ x: 0, y: 0 }}
          />
        ))}
      </div>
    </main>
  )
}

// import { InteractiveInput } from '@/components/InteractiveInput'
// import { RootState } from '@/store'

export interface InteractiveTerminalProps {
  inputRef: React.RefObject<HTMLInputElement>
  isTerminalActive: boolean
  onAdd: (key: string) => void
  allOptions: { key: string; title: string; content: React.ReactNode }[]
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  inputRef,
  isTerminalActive,
  onAdd,
  allOptions,
}) => {
  const containerClass = [
    'lg:flex-1 max-w-[32rem] h-fit',
    'border rounded-md overflow-hidden',
    isTerminalActive ? 'dark:border-white/15' : 'dark:border-white/15',
    'transition-opacity duration-700',
    'font-mono dark:text-cortex-yellow',
    'bg-cortex-tint shadow-lg',
  ].join(' ')

  const headerClass = [
    'flex gap-2 p-2 px-1.5 sm:px-3 bg-cortex-platform rounded-t-md justify-between items-center',
    'transition-all duration-500 ease-in-out border-b dark:border-white/10',
    'relative z-10',
  ].join(' ')

  return (
    <article className={containerClass}>
      <header className={headerClass}>
        <div className="flex items-center space-x-3">
          <Image
            src={SYN.icon.src}
            height={16}
            width={16}
            alt="Cortex logo"
            className=""
          />
          <h1>Synapse DeFi Terminal</h1>
        </div>
        <Wallet />
      </header>
      <div className="transition-opacity duration-500 ease-in-out opacity-100">
        <InteractiveInput
          inputRef={inputRef}
          onAdd={onAdd}
          allOptions={allOptions}
        />
      </div>
    </article>
  )
}

interface InteractiveInputProps {
  inputRef: React.RefObject<HTMLInputElement>
  onAdd: (key: string) => void
  allOptions: { key: string; title: string; content: React.ReactNode }[]
}

const InteractiveInput: React.FC<InteractiveInputProps> = ({
  inputRef,
  onAdd,
  allOptions,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const dispatch = useDispatch()

  useEffect(() => {
    setFocusedIndex(-1)
  }, [inputValue])

  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < optionRefs.current.length) {
      optionRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex])

  const visibleWindowMetadata = allOptions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // const normalizedValue = normalizeForAlias(value)
    const normalizedValue = value
    setInputValue(normalizedValue)
    if (value === '0') {
      setSuggestion('')
      return
    }
    let matchedTitle = ''

    for (const { title } of visibleWindowMetadata) {
      if (
        title.toLowerCase().startsWith(normalizedValue.toLowerCase()) &&
        normalizedValue !== ''
      ) {
        matchedTitle = title
        break
      }
    }
    if (matchedTitle && normalizedValue.length < matchedTitle.length) {
      setSuggestion(matchedTitle.slice(normalizedValue.length))
    } else {
      setSuggestion('')
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < visibleWindowMetadata.length) {
        onAdd(visibleWindowMetadata[focusedIndex].key)
      } else {
        const newValue = inputValue + suggestion
        const selection = visibleWindowMetadata.find(
          (item) => item.title.toLowerCase() === newValue.toLowerCase()
        )?.key
        if (selection) {
          onAdd(selection)
        }
      }
      setInputValue('')
      setSuggestion('')
      setFocusedIndex(-1)
      inputRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(
        (prevIndex) => (prevIndex + 1) % visibleWindowMetadata.length
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(
        (prevIndex) =>
          (prevIndex - 1 + visibleWindowMetadata.length) %
          visibleWindowMetadata.length
      )
    }
  }

  const handleOptionFocus = (index: number) => {
    setFocusedIndex(index)
  }

  const handleOptionBlur = () => {
    setTimeout(() => {
      if (!optionRefs.current.some((ref) => ref === document.activeElement)) {
        setFocusedIndex(-1)
      }
    }, 0)
  }

  return (
    <div className="mt-4">
      <ol>
        {visibleWindowMetadata.map(({ key, title }, index) => (
          <li key={key}>
            <button
              ref={(el) => {
                optionRefs.current[index] = el
              }}
              tabIndex={0}
              type="button"
              className={`
                p-1 px-1.5 pr-2
                rounded-sm
                text-left
                -ml-1
                dark:text-cortex-yellow
                hover:dark:bg-white hover:bg-cortex-yellow
                hover:dark:text-cortex-bg hover:text-cortex-text
                focus:dark:bg-white focus:bg-cortex-yellow
                focus:dark:text-cortex-bg focus:text-cortex-text
                focus:outline-none
                before:content-['•'] before:opacity-0 before:mr-1.5
                hover:before:opacity-100 focus:before:opacity-100
                ${
                  index === focusedIndex
                    ? 'bg-cortex-yellow dark:bg-white dark:text-cortex-bg text-cortex-text'
                    : ''
                }
              `}
              onClick={() => onAdd(key)}
              onFocus={() => handleOptionFocus(index)}
              onBlur={handleOptionBlur}
              onKeyDown={handleKeyDown}
            >
              {title}/
            </button>
          </li>
        ))}
      </ol>
      <div className="flex p-4 py-2 ">
        <div className="relative">
          <input
            type="text"
            className="relative bg-transparent border-cortex-border z-2 focus:outline-none"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
            ref={inputRef}
            // placeholder="|"
          />
          {suggestion && (
            <div className="absolute pointer-events-none left-3 top-2 z-1 user-select-none">
              {inputValue}
              <span className="bg-cortex-yellow dark:bg-gray-600">
                {suggestion}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
