import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Menu, X, User, LogOut } from 'lucide-react'
import clsx from 'clsx'

export default function Navbar() {
    const { user, profile, signOut, isAdmin, isFaculty } = useAuth()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [isCoordinator, setIsCoordinator] = useState(false)

    // Check if user is a coordinator
    useEffect(() => {
        const checkCoordinatorStatus = async () => {
            if (user && !isAdmin && !isFaculty) {
                // If regular user, check if they manage any events
                // Note: supabase client must be imported
                const { supabase } = await import('../../lib/supabase')
                const { data } = await supabase
                    .from('events')
                    .select('student_coordinators')
                    .not('student_coordinators', 'is', null) // filter potentially if supported or just filter in JS

                // Efficient client-side check if filtering by jsonb array existence is hard
                // Or better: Use the rpc or a specialized query if possible. 
                // Given the schema, we have to fetch events and check.
                // Optimizing: Fetch only if we really need to know.

                if (data) {
                    const isCoord = data.some(e =>
                        Array.isArray(e.student_coordinators) &&
                        e.student_coordinators.some(c => c.profile_id === user.id)
                    )
                    setIsCoordinator(isCoord)
                }
            }
        }
        checkCoordinatorStatus()
    }, [user, isAdmin, isFaculty])

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const navLinks = [
        { name: 'Events', path: '/events' },
        ...(user ? [{ name: 'Dashboard', path: isAdmin ? '/admin/dashboard' : isFaculty ? '/faculty/dashboard' : '/dashboard' }] : []),
        ...(isCoordinator ? [{ name: 'Event Dashboard', path: '/student/event-dashboard' }] : []),
    ]

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-bold text-primary">Bonhomie</span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        {user ? (
                            <div className="flex items-center space-x-4">
                                <Link
                                    to="/profile"
                                    className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                >
                                    <span className="text-sm text-gray-700">
                                        {profile?.full_name || user.email}
                                    </span>

                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex space-x-4">
                                <Link
                                    to="/login"
                                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-primary text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                        >
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className={clsx('sm:hidden', isOpen ? 'block' : 'hidden')}>
                <div className="pt-2 pb-3 space-y-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                            onClick={() => setIsOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    {!user && (
                        <>
                            <Link
                                to="/login"
                                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                                onClick={() => setIsOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                                onClick={() => setIsOpen(false)}
                            >
                                Register
                            </Link>
                        </>
                    )}
                    {user && (
                        <button
                            onClick={() => {
                                handleSignOut()
                                setIsOpen(false)
                            }}
                            className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                        >
                            Sign Out
                        </button>
                    )}
                </div>
            </div>
        </nav>
    )
}
