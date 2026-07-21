import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Avatar from './GenderAvatar'

describe('GenderAvatar', () => {
  it("jins ko'rsatilmagan bo'lsa o'g'il rasmini ko'rsatadi", () => {
    render(<Avatar gender={undefined} />)
    expect(screen.getByAltText("o'g'il")).toBeInTheDocument()
  })

  it("gender='female' bo'lsa qiz rasmini ko'rsatadi", () => {
    render(<Avatar gender="female" />)
    expect(screen.getByAltText('qiz')).toBeInTheDocument()
  })

  it("gender='male' bo'lsa o'g'il rasmini ko'rsatadi", () => {
    render(<Avatar gender="male" />)
    expect(screen.getByAltText("o'g'il")).toBeInTheDocument()
  })

  it('avatarUrl berilsa, jinsdan qat\'i nazar shu rasm ko\'rsatiladi', () => {
    render(<Avatar gender="female" avatarUrl="/custom.png" />)
    const img = screen.getByAltText('avatar')
    expect(img).toHaveAttribute('src', '/custom.png')
  })
})
