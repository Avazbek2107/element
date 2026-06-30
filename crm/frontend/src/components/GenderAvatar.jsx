export function BoyAvatar({ className = "w-full h-full" }) {
  return (
    <img
      src="/boy-avatar.png"
      alt="o'g'il"
      className={`${className} object-cover`}
    />
  )
}

export function GirlAvatar({ className = "w-full h-full" }) {
  return (
    <img
      src="/girl-avatar.png"
      alt="qiz"
      className={`${className} object-cover`}
    />
  )
}

export default function Avatar({ gender, avatarUrl, className = "w-full h-full" }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="avatar" className={`${className} object-cover`} />
  }
  return gender === 'female'
    ? <GirlAvatar className={className} />
    : <BoyAvatar className={className} />
}
