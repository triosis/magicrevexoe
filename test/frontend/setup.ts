import '@testing-library/jest-dom/vitest'
import {afterEach,vi} from 'vitest'
import {cleanup} from '@testing-library/react'
afterEach(()=>{cleanup();window.sessionStorage.clear();window.history.replaceState(null,'','/')})
Object.defineProperty(window,'scrollTo',{value:vi.fn(),writable:true})
Object.defineProperty(URL,'createObjectURL',{value:vi.fn(()=> 'blob:local-qr'),writable:true})
Object.defineProperty(URL,'revokeObjectURL',{value:vi.fn(),writable:true})
