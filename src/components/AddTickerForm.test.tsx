import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddTickerForm } from './AddTickerForm'

describe('AddTickerForm', () => {
  it('calls onAdd with an uppercase trimmed symbol on submit', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={[]} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i)
    fireEvent.change(input, { target: { value: ' aapl ' } })
    fireEvent.submit(input.closest('form')!)
    expect(onAdd).toHaveBeenCalledWith('AAPL')
  })

  it('shows an error for a duplicate ticker without calling onAdd', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={['AAPL']} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i)
    fireEvent.change(input, { target: { value: 'AAPL' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText(/already in your list/i)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('clears the input after a successful add', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={[]} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'GOOG' } })
    fireEvent.submit(input.closest('form')!)
    expect(input.value).toBe('')
  })

  it('does not submit when input is empty', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={[]} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i)
    fireEvent.submit(input.closest('form')!)
    expect(onAdd).not.toHaveBeenCalled()
  })
})
