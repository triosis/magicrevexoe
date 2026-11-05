import {render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {it, expect} from 'vitest'
import Landing from '../../src/App'

it('publishes no invented plan prices, discounts or allowances and identifies disconnected demos', () => {
  render(<Landing/>)
  const pricing = document.getElementById('pricing')!
  expect(within(pricing).getByRole('link', {name: /Sign in to your workspace/})).toHaveAttribute('href', '/login')
  expect(pricing).toHaveTextContent('No commercial prices, discounts or quotas are published here')
  expect(pricing.textContent).not.toMatch(/999|2499|5999|Save 20%|Up to \d+|billed yearly/i)
  expect(screen.getByText(/AI replies, Google review imports and NFC are demonstrations/)).toBeVisible()
})

it('editing a saved demo reply clears its saved confirmation', async () => {
  const user = userEvent.setup()
  render(<Landing/>)
  await user.click(screen.getByRole('button', {name: 'AI drafts', exact: true}))
  await user.click(screen.getByRole('button', {name: 'Save demo draft'}))
  expect(screen.getByRole('status')).toHaveTextContent('Saved in this preview')
  await user.type(screen.getByLabelText('Your sample reply'), ' changed')
  expect(screen.getByRole('status')).not.toHaveTextContent('Saved in this preview')
})
