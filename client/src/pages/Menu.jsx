
import { useEffect, useState } from 'react';
import { getMenu } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

const Menu = () => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState('');
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const data = await getMenu();
                setMenuData(data);
            } catch (error) {
                console.error("Failed to fetch menu:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, []);

    // Toggle expand for an item
    const toggleExpand = (itemId) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // ... scroll spy ...

    // Scroll spy to highlight active section
    useEffect(() => {
        const handleScroll = () => {
            const sections = document.querySelectorAll('section[id^="section-"]');
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (window.scrollY >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });
            setActiveSection(current);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [menuData]);


    // Ensure menuData is an array before mapping
    const safeMenuData = Array.isArray(menuData) ? menuData : [];
    if (!Array.isArray(menuData)) {
        console.error("Menu data is not an array:", menuData);
    }

    const filteredMenu = safeMenuData.map(section => ({
        ...section,
        items: section.items.filter(item => {
            const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
            const sectionName = section.name.toLowerCase();
            const itemName = item.name.toLowerCase();
            const itemDesc = (item.description || '').toLowerCase();
            const textContext = `${sectionName} ${itemName} ${itemDesc}`;

            return queryWords.every(word => {
                // If it looks like a number (e.g., "5", "5.5"), use strict matching
                // to avoid "5" matching "15" or "50"
                const isNumber = /^\d+(\.\d+)?$/.test(word);

                if (isNumber) {
                    // Check if price matches exactly OR if the number appears as a whole word in text
                    // \b matches word boundaries
                    const priceMatches = item.price === parseFloat(word);
                    const textMatches = new RegExp(`\\b${word}\\b`).test(textContext);
                    return priceMatches || textMatches;
                }

                // For non-numbers (text), keep substring matching (e.g. "burg" matches "burger")
                return textContext.includes(word);
            });
        })
    })).filter(section => section.items.length > 0);

    if (loading) {
        return <div className="flex h-screen items-center justify-center text-orange-600">Loading menu...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Hero Section */}
            <header className="bg-orange-600 py-12 text-white shadow-lg">
                <div className="container mx-auto px-4 text-center">
                    <img src="/number_one_plus.svg" alt="NumberOne Plus" className="h-16 md:h-24 mx-auto mb-4" />
                    <p className="text-lg text-orange-100 opacity-90">Experience the taste of excellence.</p>

                    {/* Search Bar within Header */}
                    <div className="mt-8 max-w-md mx-auto relative cursor-text">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-orange-300" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for wings, burgers..."
                            className="block w-full pl-10 pr-3 py-3 border-none rounded-full leading-5 bg-white/20 text-white placeholder-orange-100 focus:outline-none focus:bg-white/30 focus:ring-2 focus:ring-white focus:placeholder-white sm:text-sm transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Sticky Navigation */}
            <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100">
                <div className="container mx-auto px-4 py-3 overflow-x-auto scrollbar-hide">
                    <div className="flex space-x-2 sm:space-x-4 min-w-max">
                        {menuData.map((section) => (
                            <a
                                key={section.id}
                                href={`#section-${section.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById(`section-${section.id}`);
                                    if (el) {
                                        window.scrollTo({
                                            top: el.offsetTop - 140, // Offset for sticky headers
                                            behavior: 'smooth'
                                        });
                                    }
                                }}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${activeSection === `section-${section.id}`
                                    ? 'bg-orange-600 text-white shadow-md transform scale-105'
                                    : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600'
                                    }`}
                            >
                                {section.name}
                            </a>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Menu Items */}
            <main className="container mx-auto px-4 py-8 space-y-16">
                {filteredMenu.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <p className="text-xl">No items found matching "{searchQuery}"</p>
                    </div>
                ) : (
                    filteredMenu.map((section) => (
                        <section key={section.id} id={`section-${section.id}`} className="scroll-mt-32">
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{section.name}</h2>
                                <div className="h-1 flex-1 bg-gradient-to-r from-orange-200 to-transparent rounded-full"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {section.items.map((item) => {
                                    const isExpanded = !!expandedItems[item.id];
                                    return (
                                        <Card
                                            key={item.id}
                                            onClick={() => toggleExpand(item.id)}
                                            className={`group overflow-hidden border-transparent hover:border-orange-100 hover:shadow-xl transition-all duration-300 bg-white flex flex-col h-full rounded-xl cursor-pointer ${isExpanded ? 'ring-2 ring-orange-100' : ''}`}
                                        >
                                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                        <span className="text-xs font-medium">No Image</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-white/90 backdrop-blur rounded text-xs font-bold text-orange-600 shadow-sm sm:top-2 sm:right-2 sm:px-2 sm:py-1 sm:text-sm">
                                                    {item.price} DT
                                                </div>
                                                {!item.available && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] sm:text-sm font-bold rounded-full transform -rotate-6">SOLD OUT</span>
                                                    </div>
                                                )}
                                            </div>

                                            <CardHeader className="p-2 sm:p-4 pb-0 sm:pb-2 flex flex-row justify-between items-start gap-2">
                                                <CardTitle className="text-sm sm:text-lg font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition-colors">
                                                    {item.name}
                                                </CardTitle>
                                                {isExpanded ? <ChevronUp size={20} className="text-orange-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-300 shrink-0" />}
                                            </CardHeader>

                                            <CardContent className="p-2 sm:p-4 pt-0 flex-1 flex flex-col">
                                                <p className={`text-[10px] sm:text-sm text-slate-500 mb-2 flex-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                    {item.description}
                                                </p>

                                                {/* Options: Show if expanded OR on desktop (original behavior) -> Changed: now hide on desktop too unless expanded for consistency? Or keep desktop visible? 
                                                    User requested "expand to show more", implies it is hidden. 
                                                    Let's hide options by default on ALL screens to be consistent, or keep desktop visible?
                                                    The user said "expand to show more". I'll hide options by default everywhere for a cleaner look. 
                                                */}
                                                {Array.isArray(item.options) && item.options.length > 0 && (
                                                    <div className={`mt-auto pt-2 border-t border-slate-50 space-y-1 transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
                                                        {item.options.map((group, idx) => (
                                                            <div key={idx} className="text-xs flex flex-wrap gap-1">
                                                                <span className="font-semibold text-slate-700">{group.name}: </span>
                                                                <span className="text-slate-500">
                                                                    {Array.isArray(group.choices) && group.choices.map(c =>
                                                                        c.name + (c.price > 0 ? ` (+${c.price})` : '')
                                                                    ).join(', ')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </section>
                    ))
                )}
            </main>

            <footer className="bg-slate-900 py-12 text-center text-slate-400 mt-20">
                <p>&copy; 2026 NumberOne Plus. All rights reserved.</p>
                <div className="mt-4 flex justify-center gap-6">
                    <a href="https://www.instagram.com/restaurant_number_one_plus/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">Instagram</a>
                    <a href="https://www.facebook.com/profile.php?id=100093500666378" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">Facebook</a>
                </div>
            </footer>
        </div>
    );
};

export default Menu;
