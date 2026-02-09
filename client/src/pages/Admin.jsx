import { useState, useEffect } from 'react';
import { getMenu, getSections, addSection, addItem, deleteItem, login, updateSection, deleteSection, updateItem, getNames, addName, updateName, deleteName } from '@/api';
import { Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link } from 'react-router-dom';
import { Trash2, Plus, ArrowLeft, LogIn } from 'lucide-react';

const Admin = () => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [sections, setSections] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [standardNames, setStandardNames] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [newSectionName, setNewSectionName] = useState('');
    const [newStandardName, setNewStandardName] = useState('');
    const [editingItemId, setEditingItemId] = useState(null);
    const [activeTab, setActiveTab] = useState('items');
    const [filterSectionId, setFilterSectionId] = useState('all');

    // New Item Form State
    const [newItem, setNewItem] = useState({
        section_id: '',
        name: '',
        description: '',
        price: '',
        image_url: '',
        imageFile: null,
        options: [] // [{ name: "Size", choices: [{ name: "Small", price: 0 }] }]
    });

    // Login Handler
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await login(password);
            if (data.token) {
                setToken(data.token);
                localStorage.setItem('token', data.token);
            }
        } catch (error) {
            alert("Invalid Password");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                const [sData, mData, nData] = await Promise.all([getSections(), getMenu(), getNames()]);
                setSections(sData);
                setMenuData(mData);
                setStandardNames(nData);
                if (sData.length > 0 && !newItem.section_id) {
                    setNewItem(prev => ({ ...prev, section_id: sData[0].id }));
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    handleLogout();
                }
            }
        };
        fetchData();
    }, [token, refreshTrigger]);

    const handleAddSection = async (e) => {
        e.preventDefault();
        if (!newSectionName.trim()) return;
        try {
            await addSection(newSectionName);
            setNewSectionName('');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert("Failed to add section");
        }
    };

    const handleDeleteSection = async (id) => {
        if (!confirm("Delete this section and all its items?")) return;
        try {
            await deleteSection(id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert("Failed to delete section");
        }
    };

    const handleUpdateSection = async (id, currentName) => {
        const newName = prompt("Enter new section name:", currentName);
        if (!newName || newName === currentName) return;
        try {
            await updateSection(id, newName);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert("Failed to update section");
        }
    };

    const handleAddStandardName = async (e) => {
        e.preventDefault();
        if (!newStandardName.trim()) return;
        try {
            await addName(newStandardName);
            setNewStandardName('');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert("Failed to add name");
        }
    };

    const handleUpdateStandardName = async (id, currentName) => {
        const newName = prompt("Edit Item Name (This will update all items using this name):", currentName);
        if (!newName || newName === currentName) return;
        try {
            await updateName(id, newName);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert("Failed to update name");
        }
    };

    const handleDeleteStandardName = async (id) => {
        if (!confirm("Delete this name from the list? (Items using it will NOT be deleted)")) return;
        try {
            await deleteName(id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert("Failed to delete name");
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        // Validation: Name, Price, Section are required
        if (!newItem.name || !newItem.price || !newItem.section_id) {
            alert("Please fill required fields");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('section_id', newItem.section_id);
            formData.append('name', newItem.name);
            formData.append('description', newItem.description);
            formData.append('price', newItem.price);

            // Append options as string
            formData.append('options', JSON.stringify(newItem.options));

            if (newItem.imageFile) {
                formData.append('image', newItem.imageFile);
            } else {
                formData.append('image_url', newItem.image_url);
            }

            if (editingItemId) {
                await updateItem(editingItemId, formData);
            } else {
                await addItem(formData);
            }
            resetForm(newItem.section_id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                handleLogout();
                alert("Session expired. Please login again.");
                return;
            }
            const msg = error.response?.data?.error || error.message;
            alert(`Failed to save item: ${msg}`);
        }
    };

    const resetForm = (preservedSectionId = null) => {
        setNewItem({
            section_id: preservedSectionId || (sections.length > 0 ? sections[0].id : ''),
            name: '',
            description: '',
            price: '',
            image_url: '',
            imageFile: null, // Reset file
            options: []
        });
        setEditingItemId(null);
        // Clear file input manually if needed via ref, or rely on react key
    }

    const handleEditItem = (item, sectionId) => {
        setNewItem({
            section_id: sectionId,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            imageFile: null,
            options: item.options || []
        });
        setEditingItemId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteItem = async (id) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await deleteItem(id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert("Failed to delete item");
        }
    };

    // Option Management
    const addOptionGroup = () => {
        setNewItem(prev => ({
            ...prev,
            options: [...prev.options, { name: "", choices: [] }]
        }));
    };

    const removeOptionGroup = (index) => {
        setNewItem(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const updateOptionGroupName = (index, name) => {
        setNewItem(prev => {
            const newOptions = [...prev.options];
            newOptions[index].name = name;
            return { ...prev, options: newOptions };
        });
    };

    const addChoice = (groupIndex) => {
        setNewItem(prev => {
            const newOptions = [...prev.options];
            newOptions[groupIndex].choices.push({ name: "", price: 0 });
            return { ...prev, options: newOptions };
        });
    };

    const removeChoice = (groupIndex, choiceIndex) => {
        setNewItem(prev => {
            const newOptions = [...prev.options];
            newOptions[groupIndex].choices = newOptions[groupIndex].choices.filter((_, i) => i !== choiceIndex);
            return { ...prev, options: newOptions };
        });
    };

    const updateChoice = (groupIndex, choiceIndex, field, value) => {
        setNewItem(prev => {
            const newOptions = [...prev.options];
            newOptions[groupIndex].choices[choiceIndex][field] = value;
            return { ...prev, options: newOptions };
        });
    };

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl font-bold text-slate-800">Admin Access</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Password</label>
                                <Input
                                    type="password"
                                    placeholder="Enter Admin Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
                                {/* <LogIn className="mr-2 h-4 w-4" /> */}
                                {loading ? 'Checking...' : 'Login'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }


    // Bulk Import State
    const [isImporting, setIsImporting] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [importStatus, setImportStatus] = useState('');

    const handleImport = async () => {
        try {
            setImportStatus('Importing...');
            const data = JSON.parse(jsonInput);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                setImportStatus(`Success! Imported ${result.results.sections} sections and ${result.results.item} items.`);
                // trigger refresh if possible, or just alert
                // fetchSections(); // Trying to call this if it exists in scope
                window.location.reload(); // Simple brute force refresh to show new data
                setJsonInput('');
            } else {
                const err = await response.json();
                setImportStatus('Error: ' + err.error);
            }
        } catch (e) {
            setImportStatus('Invalid JSON: ' + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-6xl">
                {/* Import Section */}
                <div style={{ padding: '15px', backgroundColor: '#f0f0f0', marginBottom: '20px', borderRadius: '5px' }}>
                    <h3 onClick={() => setIsImporting(!isImporting)} style={{ cursor: 'pointer', margin: 0 }}>
                        {isImporting ? '▼ Close Import Tool' : '▶ Open Bulk Import Tool (JSON)'}
                    </h3>
                    {isImporting && (
                        <div style={{ marginTop: '10px' }}>
                            <textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                rows={10}
                                style={{ width: '100%', fontFamily: 'monospace', padding: '10px' }}
                                placeholder='[{"name":"Section", "items":[{"name":"Item", "price":10}]}]'
                            />
                            <div style={{ marginTop: '10px' }}>
                                <button onClick={handleImport} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Import Data
                                </button>
                                <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>{importStatus}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-bold text-slate-900">NumberOne Plus Admin</h1>
                    <div className="flex gap-4">
                        <Link to="/">
                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                <ArrowLeft size={16} /> Public Menu
                            </Button>
                        </Link>
                        <Button variant="secondary" onClick={handleLogout} className="w-full sm:w-auto">
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex space-x-2 border-b border-slate-200 overflow-x-auto">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'items' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('items')}
                    >
                        Menu Items
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'names' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('names')}
                    >
                        Item Names Library
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'sections' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('sections')}
                    >
                        Sections
                    </button>
                </div>

                {/* Sections Tab Content */}
                {
                    activeTab === 'sections' && (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Add New Section</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleAddSection} className="flex gap-2">
                                        <Input
                                            placeholder="Section Name"
                                            value={newSectionName}
                                            onChange={(e) => setNewSectionName(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button type="submit" size="icon" variant="primary"><Plus size={20} /></Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Manage Sections</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {sections.map(section => (
                                        <div key={section.id} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-100">
                                            <span className="text-sm font-medium text-slate-700 truncate">{section.name}</span>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => handleUpdateSection(section.id, section.name)}>
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={() => handleDeleteSection(section.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )
                }

                {/* Names Tab Content */}
                {
                    activeTab === 'names' && (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Add New Item Name</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleAddStandardName} className="flex gap-2">
                                        <Input
                                            placeholder="Item Name (e.g. Cheese Burger)"
                                            value={newStandardName}
                                            onChange={(e) => setNewStandardName(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button type="submit" size="icon" variant="primary"><Plus size={20} /></Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Manage Names Library</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {standardNames.map(sn => (
                                        <div key={sn.id} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-100">
                                            <span className="text-sm font-medium text-slate-700 truncate">{sn.name}</span>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => handleUpdateStandardName(sn.id, sn.name)}>
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={() => handleDeleteStandardName(sn.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )
                }

                {/* Items Tab Content */}
                {
                    activeTab === 'items' && (
                        <div className="grid gap-8 lg:grid-cols-3">
                            {/* Left: Add/Edit Item Form */}
                            <div className="space-y-8 lg:col-span-1">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{editingItemId ? 'Edit Item' : 'Add New Item'}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleFormSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Section</label>
                                                <select
                                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    value={newItem.section_id}
                                                    onChange={(e) => setNewItem({ ...newItem, section_id: e.target.value })}
                                                >
                                                    <option value="" disabled>Select Section</option>
                                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Name</label>
                                                <select
                                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    value={newItem.name}
                                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                                >
                                                    <option value="" disabled>Select Name from Library</option>
                                                    {/* If editing and name is not in list (custom legacy name), show it as option */}
                                                    {newItem.name && !standardNames.some(sn => sn.name === newItem.name) && (
                                                        <option value={newItem.name}>{newItem.name} (Custom)</option>
                                                    )}
                                                    {standardNames.map(sn => <option key={sn.id} value={sn.name}>{sn.name}</option>)}
                                                </select>
                                                {/* Fallback for typing new name if needed? User requested list selection. */}
                                            </div>
                                            <Input
                                                label="Price" type="number" step="0.01"
                                                value={newItem.price}
                                                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                            />
                                            <Input
                                                label="Description"
                                                value={newItem.description}
                                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            />
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Image</label>
                                                <div className="flex flex-col gap-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setNewItem({ ...newItem, imageFile: e.target.files[0] })}
                                                        className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                                    />
                                                    <span className="text-xs text-slate-400">Or use URL manually:</span>
                                                    <Input
                                                        placeholder="Image URL (optional)"
                                                        value={newItem.image_url}
                                                        onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Options UI */}
                                            <div className="border-t pt-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium">Options / Variants</span>
                                                    <Button type="button" size="sm" variant="secondary" onClick={addOptionGroup} className="text-xs">+ Group</Button>
                                                </div>
                                                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                                    {newItem.options.map((group, gIndex) => (
                                                        <div key={gIndex} className="bg-slate-50 p-3 rounded-lg border text-sm space-y-2">
                                                            <div className="flex gap-2 items-center">
                                                                <Input
                                                                    placeholder="Group (e.g. Size)"
                                                                    value={group.name}
                                                                    onChange={(e) => updateOptionGroupName(gIndex, e.target.value)}
                                                                    className="h-8 flex-1"
                                                                />
                                                                <Button type="button" size="icon" variant="ghost" onClick={() => removeOptionGroup(gIndex)} className="text-red-500 h-8 w-8">
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            </div>
                                                            <div className="pl-2 space-y-2 border-l-2 border-slate-200">
                                                                {group.choices.map((choice, cIndex) => (
                                                                    <div key={cIndex} className="flex gap-2 items-center">
                                                                        <Input
                                                                            placeholder="Choice"
                                                                            value={choice.name}
                                                                            onChange={(e) => updateChoice(gIndex, cIndex, 'name', e.target.value)}
                                                                            className="h-7 flex-1"
                                                                        />
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="+DT"
                                                                            value={choice.price}
                                                                            onChange={(e) => updateChoice(gIndex, cIndex, 'price', e.target.value)}
                                                                            className="h-7 w-16 text-right"
                                                                        />
                                                                        <Button type="button" size="icon" variant="ghost" onClick={() => removeChoice(gIndex, cIndex)} className="text-slate-400 h-7 w-7">
                                                                            &times;
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                                <Button type="button" size="sm" variant="ghost" onClick={() => addChoice(gIndex)} className="text-xs text-orange-600 h-6">
                                                                    + Add Choice
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button type="submit" className="flex-1">{editingItemId ? 'Update Item' : 'Add Item'}</Button>
                                                {editingItemId && (
                                                    <Button type="button" variant="secondary" onClick={() => resetForm()}>Cancel</Button>
                                                )}
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right: Items List */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Filter */}
                                <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                                    <span className="text-sm font-medium text-slate-600">Filter by Section:</span>
                                    <select
                                        className="rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        value={filterSectionId}
                                        onChange={(e) => setFilterSectionId(e.target.value)}
                                    >
                                        <option value="all">All Sections</option>
                                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                {menuData
                                    .filter(section => filterSectionId === 'all' || section.id === parseInt(filterSectionId))
                                    .map((section) => (
                                        <div key={section.id} className="space-y-4">
                                            <h3 className="text-xl font-bold text-slate-700 border-b pb-2">{section.name}</h3>
                                            {section.items.length === 0 ? <p className="text-sm text-slate-400 italic">No items in this section.</p> : (
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {section.items.map((item) => (
                                                        <Card key={item.id} className="flex flex-row overflow-hidden h-32">
                                                            <div className="w-24 bg-slate-100 shrink-0">
                                                                {item.image_url && <img src={item.image_url} className="h-full w-full object-cover" alt="" />}
                                                            </div>
                                                            <div className="flex-1 p-3 flex flex-col justify-between">
                                                                <div className="flex justify-between items-start">
                                                                    <span className="font-semibold text-slate-900 line-clamp-1">{item.name}</span>
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-orange-600 font-bold text-sm">{item.price} DT</span>
                                                                        {!item.available && <span className="text-xs text-red-500 font-bold">Sold Out</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 py-1">
                                                                    <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                                                                    {Array.isArray(item.options) && item.options.length > 0 && (
                                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                                            {item.options.map(o => (
                                                                                <span key={o.name} className="text-[10px] bg-slate-100 px-1 rounded text-slate-600 border border-slate-200">
                                                                                    {o.name}: {Array.isArray(o.choices) ? o.choices.length : 0}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex justify-end">
                                                                    <div className="flex justify-end gap-1">
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => handleEditItem(item, section.id)}>
                                                                            <Pencil size={16} />
                                                                        </Button>
                                                                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default Admin;
