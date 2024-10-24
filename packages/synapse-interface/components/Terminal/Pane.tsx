import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

// import { RootState } from '@/store'

interface PaneProps {
  header: string
  content: React.ReactNode
  onRemove: () => void
  isSelected: boolean
  initialPosition: { x: number; y: number }
}

export const Pane: React.FC<PaneProps> = ({
  header,
  content,
  onRemove,
  isSelected = true,
  initialPosition,
}) => {
  const [position, setPosition] = useState(initialPosition)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragged, setDragged] = useState(false)
  const detailsRef = useRef<HTMLDetailsElement>(null)

  const dispatch = useDispatch()
  // const { zIndex } = useSelector(
  //   (state: RootState) =>
  //     state.selectedOptions.selectedOptions.find((opt) => opt.id === id) || {
  //       zIndex: 100,
  //     }
  // )

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true)
    setDragged(false)
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging) {
        const newX = e.clientX - offset.x
        const newY = e.clientY - offset.y
        setPosition({ x: newX, y: newY })
        setDragged(true)
      }
    },
    [dragging, offset]
  )

  const handleMouseUp = () => {
    setDragging(false)
  }

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    } else {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove])

  const paneClassName = [
    'pane',
    'left-0 md:relative flex flex-col justify-between',
    'w-full max-sm:h-full max-w-[32rem] max-lg:place-self-end',
    // 'animate-fadeIn',
    'border border-cortex-border rounded-md',
    isSelected
      ? 'dark:border-white/10 shadow-lg' // use border-white/15 if multiple windows are brought back
      : 'dark:border-white/10 shadow-sm',
    // 'bg-cortex-tint/85 backdrop-blur-lg',
    'bg-cortex-tint',
    'font-mono text-base',
  ].join(' ')

  const summaryClassName =
    [
      'flex items-center',
      'group-open:border-b border-cortex-border dark:border-white/10',
      'rounded-md group-open:rounded-b-none',
      'px-4 py-1',
      'select-none',
      'cursor-pointer',
    ].join(' ') + (isSelected ? ' bg-cortex-platform text-cortex-strong' : '')

  const summaryButtonClassName = [
    'opacity-65 hover:opacity-100',
    'dark:hover:text-cortex-yellow',
    'ml-2 p-1',
  ].join(' ')

  const toggleOpenPane = () => {
    if (detailsRef.current) {
      detailsRef.current.open = !detailsRef.current.open
    }
  }

  return (
    <>
      <div
        className={paneClassName}
        style={{
          left: window.innerWidth >= 768 ? `${position.x}px` : undefined,
          top: `${position.y}px`,
          // zIndex,
        }}
      >
        <details ref={detailsRef} open className="group">
          <summary
            className={summaryClassName}
            onClick={(e) => e.preventDefault()}
            onDoubleClick={toggleOpenPane}
            onMouseDown={handleMouseDown}
          >
            <header className="grow before:content-['#_'] before:opacity-65">
              {header}
            </header>
            {/* <button
            type="button"
            className={summaryButtonClassName}
            onClick={(e) => {
              e.stopPropagation()
              toggleOpenPane()
            }}
          >
            &minus;
          </button> */}
            <button
              type="button"
              className={summaryButtonClassName}
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              &times;
            </button>
          </summary>
          <div className="p-4 font-sans tracking-widest">{content}</div>
        </details>
      </div>
    </>
  )
}
