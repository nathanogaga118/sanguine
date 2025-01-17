import Image from 'next/image'
import { useState, useEffect } from 'react'
import copyImg from '@assets/icons/copy.png'

export const CopyTitle = ({
  title,
  className,
}: {
  title: string
  className?: string
}) => {
  const [copy, setCopy] = useState(false)

  useEffect(() => {
    const timeId = setTimeout(() => {
      setCopy(false)
    }, 3000)

    return () => {
      clearTimeout(timeId)
    }
  }, [copy])
  const handleCopy = () => {
    navigator.clipboard.writeText(title)
    setCopy(true)
  }
  return (
    <div className={className}>
      <div className={`flex flex-row hover:opacity-[0.8] transition-all`}>
        <h3
          className="text-2xl font-semibold text-white cursor-pointer"
          onClick={() => {
            handleCopy()
          }}
        >
          {title}{' '}
        </h3>
        <Image
          onClick={() => {
            handleCopy()
          }}
          src={copyImg}
          alt="copy img"
          className={
            'transition-all ease-in-out ml-2 mt-[11px] w-[15px] h-fit inverted cursor-pointer'
          }
        />
        <span
          className={
            'transition-all ease-in-out text-white text-xs pl-1 pt-[10px]' +
            (copy ? ' visible opacity-[1]' : ' invisible opacity-[0]')
          }
        >
          copied
        </span>
      </div>
    </div>
  )
}
