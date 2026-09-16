import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import Login from '../modules/auth/Login'
import '../i18n'

function renderLogin() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Login page', () => {
  it('renders email, password fields and a submit button', () => {
    renderLogin()
    expect(screen.getByText(/Log in/i, { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(1)
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })
})
