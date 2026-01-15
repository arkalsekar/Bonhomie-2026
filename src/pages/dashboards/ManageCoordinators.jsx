import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Plus, Trash2, Search, Check, X, ArrowLeft, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ManageCoordinators() {
    const { user } = useAuth()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // State for managing the "Add Coordinator" modal/flow
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [emailSearch, setEmailSearch] = useState('')
    const [foundStudent, setFoundStudent] = useState(null)
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState('')

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('name')

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
            alert('Error fetching events')
        } finally {
            setLoading(false)
        }
    }

    const searchStudent = async () => {
        if (!emailSearch.trim()) return

        setSearchLoading(true)
        setSearchError('')
        setFoundStudent(null)

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, college_email')
                .ilike('college_email', emailSearch.trim()) // Exact match or strictly filtered preference? User said "add email", usually exact.
                .single()

            if (error) {
                if (error.code === 'PGRST116') { // No rows found
                    setSearchError('Student not found with this email.')
                } else {
                    setSearchError('Error searching for student.')
                    console.error(error)
                }
            } else {
                setFoundStudent(data)
            }
        } catch (error) {
            setSearchError('An unexpected error occurred.')
            console.error(error)
        } finally {
            setSearchLoading(false)
        }
    }

    const addCoordinator = async () => {
        if (!selectedEvent || !foundStudent) return

        try {
            const currentCoordinators = selectedEvent.student_coordinators || []

            // Check if already added
            if (currentCoordinators.some(c => c.profile_id === foundStudent.id)) {
                alert('This student is already a coordinator for this event.')
                return
            }

            const newCoordinator = {
                profile_id: foundStudent.id,
                name: foundStudent.full_name
            }

            const updatedCoordinators = [...currentCoordinators, newCoordinator]

            const { error } = await supabase
                .from('events')
                .update({ student_coordinators: updatedCoordinators })
                .eq('id', selectedEvent.id)

            if (error) throw error

            // Update local state
            setEvents(events.map(e =>
                e.id === selectedEvent.id
                    ? { ...e, student_coordinators: updatedCoordinators }
                    : e
            ))

            // Reset selection
            setFoundStudent(null)
            setEmailSearch('')
            setSelectedEvent(null) // Close modal/form

        } catch (error) {
            console.error('Error adding coordinator:', error)
            alert('Failed to add coordinator')
        }
    }

    const removeCoordinator = async (eventId, coordinatorProfileId) => {
        if (!confirm('Are you sure you want to remove this coordinator?')) return

        try {
            const event = events.find(e => e.id === eventId)
            if (!event) return

            const updatedCoordinators = (event.student_coordinators || [])
                .filter(c => c.profile_id !== coordinatorProfileId)

            const { error } = await supabase
                .from('events')
                .update({ student_coordinators: updatedCoordinators })
                .eq('id', eventId)

            if (error) throw error

            setEvents(events.map(e =>
                e.id === eventId
                    ? { ...e, student_coordinators: updatedCoordinators }
                    : e
            ))

        } catch (error) {
            console.error('Error removing coordinator:', error)
            alert('Failed to remove coordinator')
        }
    }

    const filteredEvents = events.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link to="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Manage Coordinators</h1>
                    </div>
                    <p className="text-gray-600 ml-7">Add or remove student coordinators for events.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredEvents.map(event => (
                    <div key={event.id} className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                                <p className="text-sm text-gray-500">{event.category} • {event.subcategory}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedEvent(event)
                                    setFoundStudent(null)
                                    setEmailSearch('')
                                    setSearchError('')
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-primary text-primary text-sm font-medium rounded-md hover:bg-blue-50"
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add Coordinator
                            </button>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Current Coordinators</h4>
                            {(!event.student_coordinators || event.student_coordinators.length === 0) ? (
                                <p className="text-sm text-gray-500 italic">No coordinators assigned.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {event.student_coordinators.map((coord, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">{coord.name}</span>
                                                <span className="text-xs text-gray-500 font-mono" title={coord.profile_id}>UUID: ...{coord.profile_id.slice(-6)}</span>
                                            </div>
                                            <button
                                                onClick={() => removeCoordinator(event.id, coord.profile_id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Remove"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Coordinator Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Add Coordinator to {selectedEvent.name}</h3>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Email</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={emailSearch}
                                        onChange={(e) => setEmailSearch(e.target.value)}
                                        placeholder="enter.email@college.edu"
                                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
                                    />
                                    <button
                                        onClick={searchStudent}
                                        disabled={searchLoading}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {searchLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Search'}
                                    </button>
                                </div>
                                {searchError && <p className="mt-1 text-sm text-red-600">{searchError}</p>}
                            </div>

                            {foundStudent && (
                                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                    <h4 className="text-sm font-medium text-blue-900 mb-2">Confirm Student Details</h4>
                                    <div className="text-sm text-blue-800 space-y-1">
                                        <p><span className="font-semibold">Name:</span> {foundStudent.full_name}</p>
                                        <p><span className="font-semibold">Email:</span> {foundStudent.college_email}</p>
                                        <p><span className="font-semibold">UUID:</span> <span className="font-mono text-xs">{foundStudent.id}</span></p>
                                    </div>
                                    <button
                                        onClick={addCoordinator}
                                        className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Confirm & Add
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
