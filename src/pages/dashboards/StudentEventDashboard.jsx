import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Download, Search, Users, Calendar, MapPin, Edit } from 'lucide-react'
import { format } from 'date-fns'

export default function StudentEventDashboard() {
    const { user } = useAuth()
    const [myEvents, setMyEvents] = useState([])
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [registrations, setRegistrations] = useState([])
    const [loading, setLoading] = useState(true)
    const [regLoading, setRegLoading] = useState(false)
    const [viewMode, setViewMode] = useState('list') // 'list', 'details', 'registrations'

    // Editing State
    const [editForm, setEditForm] = useState({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (user) {
            fetchMyEvents()
        }
    }, [user])

    const fetchMyEvents = async () => {
        setLoading(true)
        try {
            // Fetch all events and filter client-side for simplicity, 
            // or use complex postgrest filter if possible.
            // Client-side filtering for JSON arrays is easier with Supabase JS if dataset is not huge.
            // Alternatively, could use .contains() if the JSONB structure allows, but here we have array of objects.

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('name')

            if (error) throw error

            // Filter where current user is a coordinator
            const coordinatedEvents = data.filter(event =>
                event.student_coordinators?.some(c => c.profile_id === user.id)
            )

            setMyEvents(coordinatedEvents)

            // If viewing details of a specific event, refresh it
            if (selectedEvent) {
                const updated = coordinatedEvents.find(e => e.id === selectedEvent.id)
                if (updated) setSelectedEvent(updated)
            }

        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchRegistrations = async (eventId) => {
        setRegLoading(true)
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    profile:profiles(full_name, college_email, roll_number, phone, school, department, year_of_study)
                `)
                .eq('event_id', eventId)
                .order('registered_at', { ascending: false })

            if (error) throw error
            setRegistrations(data || [])
        } catch (error) {
            console.error('Error fetching registrations:', error)
        } finally {
            setRegLoading(false)
        }
    }

    const handleEventClick = (event) => {
        setSelectedEvent(event)
        setEditForm({
            headline: event.name,
            description: event.description || '',
            venue: event.venue || '',
            venue_details: event.venue_details || '',
            rules: event.rules ? (typeof event.rules[0] === 'string' ? event.rules.join('\n') : JSON.stringify(event.rules, null, 2)) : '',
            image_path: event.image_path || '',
        })
        setViewMode('details')
    }

    const handleViewRegistrations = (event) => {
        handleEventClick(event)
        setViewMode('registrations')
        fetchRegistrations(event.id)
    }

    const handleUpdateEvent = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Process rules: split by newline if it's text
            const processedRules = editForm.rules.split('\n').filter(r => r.trim() !== '')

            const { error } = await supabase
                .from('events')
                .update({
                    description: editForm.description,
                    venue: editForm.venue,
                    venue_details: editForm.venue_details,
                    rules: processedRules,
                    // Note: Student coordinators might be restricted on what they can edit.
                    // Assuming description, venue, rules are safe.
                })
                .eq('id', selectedEvent.id)

            if (error) throw error

            alert('Event updated successfully!')
            fetchMyEvents() // Refresh data
        } catch (error) {
            console.error('Error updating event:', error)
            alert('Failed to update event.')
        } finally {
            setSaving(false)
        }
    }

    const exportToCSV = () => {
        if (!registrations.length) return

        const headers = [
            'Student Name', 'Email', 'Roll Number', 'Phone',
            'School', 'Department', 'Year', 'Status', 'Registered At'
        ]

        const rows = registrations.map(reg => [
            reg.profile?.full_name || '',
            reg.profile?.college_email || '',
            reg.profile?.roll_number || '',
            reg.profile?.phone || '',
            reg.profile?.school || '',
            reg.profile?.department || '',
            reg.profile?.year_of_study || '',
            reg.status || '',
            reg.registered_at ? format(new Date(reg.registered_at), 'yyyy-MM-dd HH:mm') : ''
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${selectedEvent.name}_registrations.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading && !selectedEvent) return (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Coordinator Dashboard</h1>
            <p className="text-gray-600 mb-8">Manage your assigned events and view student registrations.</p>

            {myEvents.length === 0 ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-sm text-yellow-700">
                        You are not assigned as a coordinator for any events.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar / List of Events */}
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">My Events</h2>
                        <div className="space-y-2">
                            {myEvents.map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedEvent?.id === event.id
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <div className="font-medium">{event.name}</div>
                                    <div className={`text-xs mt-1 ${selectedEvent?.id === event.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {event.category}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        {selectedEvent && (
                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                {/* Tabs */}
                                <div className="border-b border-gray-200">
                                    <nav className="-mb-px flex">
                                        <button
                                            onClick={() => setViewMode('details')}
                                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${viewMode === 'details'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            Edit Details
                                        </button>
                                        <button
                                            onClick={() => handleViewRegistrations(selectedEvent)}
                                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${viewMode === 'registrations'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            Registrations
                                        </button>
                                    </nav>
                                </div>

                                <div className="p-6">
                                    {viewMode === 'details' ? (
                                        <form onSubmit={handleUpdateEvent} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                                <textarea
                                                    rows={4}
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Venue</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.venue}
                                                        onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Venue Details</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.venue_details}
                                                        onChange={(e) => setEditForm({ ...editForm, venue_details: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Rules (One per line)</label>
                                                <textarea
                                                    rows={6}
                                                    value={editForm.rules}
                                                    onChange={(e) => setEditForm({ ...editForm, rules: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm font-mono"
                                                    placeholder="Rule 1&#10;Rule 2&#10;Rule 3"
                                                />
                                            </div>

                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                                                >
                                                    {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                                                    Save Changes
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    Registered Students ({registrations.length})
                                                </h3>
                                                <button
                                                    onClick={exportToCSV}
                                                    disabled={registrations.length === 0}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Export CSV
                                                </button>
                                            </div>

                                            {regLoading ? (
                                                <div className="flex justify-center py-8">
                                                    <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
                                                </div>
                                            ) : registrations.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {registrations.map((reg) => (
                                                                <tr key={reg.id}>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm font-medium text-gray-900">{reg.profile?.full_name}</div>
                                                                        <div className="text-sm text-gray-500">{reg.profile?.college_email}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900">{reg.profile?.roll_number}</div>
                                                                        <div className="text-xs text-gray-500">{reg.profile?.department}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                                            reg.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                                'bg-yellow-100 text-yellow-800'
                                                                            }`}>
                                                                            {reg.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-center text-gray-500 py-8">No students have registered for this event yet.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
