/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Github, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink, 
  ChevronDown, 
  Code, 
  Palette, 
  Megaphone, 
  Cpu, 
  Video, 
  Layout, 
  Download,
  Menu,
  X,
  Award,
  Globe,
  Zap,
  Plus,
  Trash2,
  LogOut,
  LogIn,
  Loader2,
  Upload,
  CheckCircle2,
  Camera,
  Edit3,
  ArrowUp
} from "lucide-react";
import { 
  auth, 
  db, 
  login, 
  logout, 
  uploadImageWithProgress, 
  addPortfolioItem, 
  deletePortfolioItem,
  setProfileImage,
  deleteProfileImage,
  PortfolioItem,
  Profile,
  handleFirestoreError,
  OperationType,
  testConnection,
  testStorageConnection
} from "./firebase";
import firebaseConfig from "../firebase-applet-config.json";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";

const SKILLS = [
  { name: "Social Media Marketing", icon: <Megaphone className="w-5 h-5" />, level: 95, tools: "Ads, Content Strategy, Engagement" },
  { name: "Graphic Design", icon: <Palette className="w-5 h-5" />, level: 95, tools: "Photoshop, Illustrator, InDesign" },
  { name: "Web Development", icon: <Code className="w-5 h-5" />, level: 90, tools: "WordPress, Shopify, React" },
  { name: "AI & Machine Learning", icon: <Cpu className="w-5 h-5" />, level: 85, tools: "Prompt Engineering, Model Integration" },
  { name: "Video Editing", icon: <Video className="w-5 h-5" />, level: 88, tools: "After Effects, Premiere Pro" },
  { name: "UI/UX Design", icon: <Layout className="w-5 h-5" />, level: 85, tools: "Figma, App Design" },
];

const EXPERIENCE = [
  {
    role: "IT Officer & Digital Marketer",
    company: "Onyx Earth Renewables",
    period: "2023 – 2025",
    description: [
      "Managed company IT infrastructure and technical support",
      "Developed and maintained the company website",
      "Implemented digital marketing strategies to promote renewable energy solutions",
      "Managed social media accounts and online campaigns",
      "Designed marketing materials (ads, brochures, presentations)",
      "Analyzed campaign performance and optimized engagement",
      "Supported internal systems, data handling, and cybersecurity practices",
      "Assisted in branding and digital transformation initiatives"
    ]
  },
  {
    role: "Media Officer",
    company: "Patsime Trust, Harare",
    period: "May 2020 – Present",
    description: [
      "Produced television and theatre media content",
      "Managed social media platforms and digital campaigns",
      "Designed posters, adverts, and company profiles",
      "Edited video and audio for productions and radio dramas",
      "Trained interns in media and IT skills",
      "Conducted research for projects and campaigns"
    ]
  },
  {
    role: "Web Developer",
    company: "Datcitizen, Harare",
    period: "Aug 2018 – Present",
    description: [
      "Designed and developed websites and web applications",
      "Created graphics, animations, and multimedia content",
      "Managed digital campaigns including budgeting and scheduling",
      "Produced marketing materials such as brochures, presentations, and promotional content",
      "Coordinated production processes and tracked project progress"
    ]
  }
];

const PORTFOLIO_CATEGORIES = ["All", "Social Media Design", "Web Development", "Graphic Design", "Video Editing"];

const getVideoEmbedUrl = (url: string) => {
  if (!url) return null;
  
  // YouTube
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Facebook
  const fbMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com\/watch\/\?v=|facebook\.com\/.*\/videos\/)([^&?/\s]+)/);
  if (fbMatch) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`;

  return null;
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [user, setUser] = useState<User | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [storageMode, setStorageMode] = useState<"storage" | "database" | "checking">("checking");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const [profileImage, setProfileImageState] = useState<string | null>(null);
  const [profileBio, setProfileBio] = useState<string>("");
  const [profileAge, setProfileAge] = useState<number>(28);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [editBio, setEditBio] = useState("");
  const [editAge, setEditAge] = useState(28);
  const [newProject, setNewProject] = useState({
    title: "",
    category: activeCategory === "All" ? "Social Media Design" : activeCategory,
    link: "",
    file: null as File | null
  });

  // Fetch profile info
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "profile", "main"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileImageState(data.imageUrl);
        setProfileBio(data.bio || "Creative professional specializing in Graphic Design, Web Development, and Digital Marketing.");
        setProfileAge(data.age || 28);
        setEditBio(data.bio || "Creative professional specializing in Graphic Design, Web Development, and Digital Marketing.");
        setEditAge(data.age || 28);
      } else {
        setProfileImageState(null);
        setProfileBio("Creative professional specializing in Graphic Design, Web Development, and Digital Marketing.");
        setProfileAge(28);
        setEditBio("Creative professional specializing in Graphic Design, Web Development, and Digital Marketing.");
        setEditAge(28);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync category when activeCategory changes and form is closed
  useEffect(() => {
    if (!showUploadForm) {
      setNewProject(prev => ({
        ...prev,
        category: activeCategory === "All" ? "Social Media Design" : activeCategory
      }));
    }
  }, [activeCategory, showUploadForm]);  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsProfileUploading(true);
    try {
      await setDoc(doc(db, "profile", "main"), {
        imageUrl: profileImage || "",
        bio: editBio,
        age: editAge,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditingProfile(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsProfileUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setNewProject({ ...newProject, file: e.dataTransfer.files[0] });
    }
  };

  const isAdmin = user?.email === "sashaserima@gmail.com" && user?.emailVerified === true;
  console.log("Admin check:", { email: user?.email, isAdmin });

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log("User logged in:", currentUser.email, "Verified:", currentUser.emailVerified);
      }
    });
    return () => unsubscribe();
  }, []);

  // Connection test
  useEffect(() => {
    testConnection();
    const checkStorage = async () => {
      const isStorageAvailable = await testStorageConnection();
      // If all storage tests failed, we're in database mode
      // Note: testStorageConnection returns true if fallback is active, but we want to know if it's NATIVE storage
      // Actually, I'll update testStorageConnection to return false if native storage is unavailable
      // Wait, I just changed it to return true. Let me fix that.
      setStorageMode(isStorageAvailable ? "storage" : "database");
    };
    checkStorage();
  }, []);

  // Firestore listener
  useEffect(() => {
    const q = query(collection(db, "portfolio_items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PortfolioItem[];
      setPortfolioItems(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "portfolio_items");
    });
    return () => unsubscribe();
  }, []);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProfileUploading(true);
    setUploadProgress(0);
    setUploadStatus("Starting profile upload...");
    
    try {
      const imageUrl = await uploadImageWithProgress(file, (progress) => {
        setUploadProgress(Math.round(progress));
      }, (status) => {
        setUploadStatus(status);
      });
      await setProfileImage(imageUrl);
      setUploadStatus("Profile photo updated!");
      setTimeout(() => setUploadStatus(""), 3000);
    } catch (error) {
      console.error("Profile upload failed:", error);
      setUploadStatus("Upload failed");
    } finally {
      setIsProfileUploading(false);
      setUploadProgress(0);
    }
  };

  const handleProfileImageDelete = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    
    try {
      await deleteProfileImage();
    } catch (error) {
      console.error("Profile deletion failed:", error);
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error: any) {
      console.error("Login error:", error);
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Login request was cancelled or a popup was already pending.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log("User closed the login popup.");
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        console.error("Firebase Auth Internal Error detected. This usually happens when multiple popup requests are made.");
        alert("There was a technical issue with the login popup. Please wait a moment and try again.");
      } else {
        alert("Login failed: " + (error.message || "Unknown error"));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleUpload function called");
    
    if (!user) {
      console.error("Upload failed: No user logged in");
      alert("You must be logged in to upload.");
      return;
    }

    if (!newProject.file && !newProject.link) {
      console.error("Upload failed: No file or link selected");
      alert("Please select an image file or provide a video link.");
      return;
    }

    if (!newProject.title) {
      console.error("Upload failed: No title entered");
      alert("Please enter a project title.");
      return;
    }

    // Check file size (max 5MB)
    if (newProject.file && newProject.file.size > 5 * 1024 * 1024) {
      console.error("Upload failed: File too large", newProject.file.size);
      alert("File is too large. Maximum size is 5MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Starting...");
    console.log("Starting upload for:", newProject.title, "File:", newProject.file?.name || "none", "Link:", newProject.link);

    try {
      let imageUrl = "";
      if (newProject.file) {
        console.log("Calling uploadImageWithProgress...");
        imageUrl = await uploadImageWithProgress(
          newProject.file, 
          (progress) => {
            const roundedProgress = Math.round(progress);
            setUploadProgress(roundedProgress);
            console.log(`Upload progress updated in UI: ${roundedProgress}%`);
          },
          (status) => {
            setUploadStatus(status);
            console.log(`Upload status updated in UI: ${status}`);
          }
        );
        console.log("uploadImageWithProgress returned successfully. URL:", imageUrl);
      }
      
      console.log("Saving to Firestore...");
      
      const itemData: any = {
        title: newProject.title,
        category: newProject.category,
        uid: user.uid
      };

      if (newProject.link) {
        itemData.link = newProject.link;
      }

      if (imageUrl) {
        itemData.image = imageUrl;
      } else if (newProject.category === "Web Development" && newProject.link) {
        // Auto-generate thumbnail for Web Development if no image uploaded
        // Using thum.io for high-quality website screenshots
        const cleanUrl = newProject.link.replace(/^https?:\/\//, '');
        itemData.image = `https://image.thum.io/get/width/800/crop/800/https://${cleanUrl}`;
        console.log("Auto-generating website thumbnail:", itemData.image);
      }
      
      await addPortfolioItem(itemData);

      console.log("Project saved successfully to Firestore!");
      setNewProject({ title: "", category: "Social Media Design", link: "", file: null });
      setShowUploadForm(false);
      alert("Project published successfully!");
    } catch (error) {
      console.error("Upload process failed:", error);
      let errorMessage = "Failed to upload project.";
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        errorMessage += `\n\nDetails: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    console.log("handleDelete called for ID:", id);
    try {
      console.log("Proceeding with deletion...");
      await deletePortfolioItem(id);
      console.log("Delete successful");
      setDeletingId(null);
      alert("Project deleted successfully.");
    } catch (error) {
      console.error("Delete failed in UI:", error);
      alert("Failed to delete project. Check console for details.");
    }
  };

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredPortfolio = activeCategory === "All" 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen font-sans bg-slate-950 text-slate-100 selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass px-4 sm:px-6 py-4 sm:py-5 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl sm:text-2xl font-display font-bold tracking-tighter"
          >
            SASHA<span className="text-primary">SERIMA</span>
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8 lg:space-x-10">
            {["About", "Skills", "Portfolio", "Experience", "Contact"].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`}
                className="text-[10px] lg:text-xs uppercase tracking-widest font-bold hover:text-primary transition-colors"
              >
                {item}
              </a>
            ))}
            
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-primary px-2 py-1 border border-primary/30 rounded-sm">Admin</span>
                    {storageMode === "database" && (
                      <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500 px-2 py-1 border border-amber-500/30 rounded-sm bg-amber-500/5" title="Storage is unavailable, using database fallback">Database Mode</span>
                    )}
                  </div>
                )}
                <button 
                  onClick={logout}
                  className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold hover:text-primary transition-colors bg-white/5 px-3 py-2 rounded-sm"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className={`flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold hover:text-primary transition-colors bg-white/5 px-3 py-2 rounded-sm border border-white/10 hover:border-primary/50 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoggingIn ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                ) : (
                  <LogIn className="w-3 h-3" />
                )}
                <span>{isLoggingIn ? 'Connecting...' : 'Admin Login'}</span>
              </button>
            )}

            <a 
              href="#contact"
              className="px-5 lg:px-6 py-2 bg-primary text-black text-[10px] lg:text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-gold-light transition-colors"
            >
              Hire Me
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-primary"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 w-full bg-slate-950/95 backdrop-blur-xl border-b border-white/5 md:hidden"
            >
              <div className="flex flex-col p-8 space-y-6 text-center">
                {["About", "Skills", "Portfolio", "Experience", "Contact"].map((item) => (
                  <a 
                    key={item} 
                    href={`#${item.toLowerCase()}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-xs uppercase tracking-[0.3em] font-bold text-slate-300 hover:text-primary transition-colors"
                  >
                    {item}
                  </a>
                ))}

                <div className="pt-4 border-t border-white/5">
                  {user ? (
                    <div className="flex flex-col items-center space-y-4">
                      {isAdmin && (
                        <div className="flex flex-col items-center space-y-2">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-primary">Admin Access</span>
                          {storageMode === "database" && (
                            <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500 px-2 py-1 border border-amber-500/30 rounded-sm bg-amber-500/5">Database Mode Active</span>
                          )}
                        </div>
                      )}
                      <button 
                        onClick={() => { logout(); setIsMenuOpen(false); }}
                        className="flex items-center space-x-2 text-xs uppercase tracking-widest font-bold text-slate-300 hover:text-primary transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { handleLogin(); setIsMenuOpen(false); }}
                      disabled={isLoggingIn}
                      className={`flex items-center justify-center space-x-2 text-xs uppercase tracking-widest font-bold text-slate-300 hover:text-primary transition-colors ${isLoggingIn ? 'opacity-50' : ''}`}
                    >
                      {isLoggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>{isLoggingIn ? 'Connecting...' : 'Admin Login'}</span>
                    </button>
                  )}
                </div>

                <a 
                  href="#contact"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-4 bg-primary text-black text-xs font-bold uppercase tracking-widest rounded-sm"
                >
                  Hire Me
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Background Layers & Atmospheric Effects */}
        <div className="absolute inset-0 z-0">
          {/* Deep Atmospheric Gradients */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05),transparent_70%)]" />
          
          {/* Volumetric Light Leaks */}
          <motion.div 
            animate={{ 
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.1, 1],
              x: [-20, 20, -20]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px]" 
          />
          <motion.div 
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              scale: [1.2, 1, 1.2],
              x: [20, -20, 20]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[160px]" 
          />

          {/* Floating Particles / Dust */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%", 
                opacity: Math.random() * 0.5 
              }}
              animate={{ 
                y: [null, (Math.random() - 0.5) * 100 + "px"],
                opacity: [0.1, 0.4, 0.1]
              }}
              transition={{ 
                duration: 5 + Math.random() * 10, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute w-1 h-1 bg-primary/30 rounded-full blur-[1px]"
            />
          ))}

          {/* Light Trails */}
          <motion.div 
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 left-0 w-64 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-sm rotate-12"
          />

          {/* Floating 3D Geometric Shapes (Futuristic/Immersive) */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`shape-3d-${i}`}
              initial={{ 
                x: (10 + Math.random() * 80) + "%", 
                y: (10 + Math.random() * 80) + "%",
                z: -100,
                rotateX: 0,
                rotateY: 0,
                opacity: 0
              }}
              animate={{ 
                y: [null, (Math.random() - 0.5) * 200 + "px"],
                z: [Math.random() * 100, Math.random() * -100],
                rotateX: [0, 360],
                rotateY: [0, 360],
                opacity: [0, 0.2, 0]
              }}
              transition={{ 
                duration: 15 + Math.random() * 10, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: i * 2
              }}
              style={{ perspective: 1000 }}
              className="absolute pointer-events-none"
            >
              <div className={`w-12 h-12 border border-primary/20 rounded-${i % 2 === 0 ? 'lg' : 'full'} backdrop-blur-[2px]`} />
            </motion.div>
          ))}

          {/* Dynamic Light Beams (Enhanced) */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`beam-enhanced-${i}`}
              animate={{ 
                x: ['-20vw', '120vw'],
                opacity: [0, 0.4, 0],
                scaleY: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 12 + i * 4, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: i * 3
              }}
              className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-primary/30 to-transparent blur-[4px] skew-x-[-20deg]"
            />
          ))}

          {/* Floating Geometric Shapes (Futuristic/Minimalist) */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`shape-${i}`}
              initial={{ 
                x: (20 + i * 20) + "%", 
                y: (20 + (i % 2) * 40) + "%",
                rotate: 0,
                scale: 0.8
              }}
              animate={{ 
                y: [null, (Math.random() - 0.5) * 150 + "px"],
                rotate: [0, 360],
                rotateX: [0, 180],
                rotateY: [0, 180],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ 
                duration: 20 + i * 10, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute w-32 h-32 border border-primary/10 rounded-sm pointer-events-none"
              style={{ 
                transformStyle: 'preserve-3d',
                perspective: '1000px'
              }}
            />
          ))}
        </div>

        {/* Reflective Floor */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-primary/5 to-transparent opacity-30 pointer-events-none z-0" 
             style={{ maskImage: 'linear-gradient(to top, black, transparent)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center perspective-1000">
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Reflection (Visual only) */}
            <div className="absolute -bottom-full left-0 w-full opacity-10 blur-sm scale-y-[-1] pointer-events-none select-none hidden lg:block">
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter leading-none text-white/50">
                Sasha Serima
              </h1>
            </div>

            <div className="flex items-center justify-center space-x-6 mb-12">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 60 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-[1px] bg-primary/50" 
              />
              <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.8em] font-bold text-primary/80 drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                Established 2018
              </h2>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 60 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-[1px] bg-primary/50" 
              />
            </div>
            
            <h1 className="relative text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-display font-bold mb-8 tracking-tighter leading-none select-none">
              {/* Main Text with Premium Material Finish */}
              <span className="relative inline-block">
                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-300 to-slate-500 blur-[0.5px]">Sasha</span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">Sasha</span>
              </span>
              <span className="relative inline-block ml-4">
                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-b from-primary via-gold-light to-gold-dark italic blur-[0.5px]">Serima</span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-b from-primary via-gold-light to-gold-dark italic drop-shadow-[0_10px_30px_rgba(212,175,55,0.2)]">Serima</span>
              </span>
              
              {/* Subtle Highlight / Reflection Glint */}
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none"
                style={{ mixBlendMode: 'overlay' }}
              />
            </h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed tracking-wide"
            >
              A distinguished <span className="text-white/90 font-medium">Creative Technologist</span> specializing in the intersection of <span className="text-primary/90 font-medium">high-end design</span>, <span className="text-white/90 font-medium">web architecture</span>, and <span className="text-white/90 font-medium">AI innovation</span>.
            </motion.p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <motion.a 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                href="#portfolio"
                className="w-full sm:w-auto px-12 py-5 bg-primary text-black font-bold uppercase tracking-[0.2em] text-xs hover:bg-gold-light transition-all shadow-[0_20px_40px_rgba(212,175,55,0.15)] rounded-sm"
              >
                Explore Portfolio
              </motion.a>
              <motion.a 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                href="#contact"
                className="w-full sm:w-auto px-12 py-5 border border-primary/20 text-primary font-bold uppercase tracking-[0.2em] text-xs hover:bg-primary/5 transition-all rounded-sm backdrop-blur-sm"
              >
                Get In Touch
              </motion.a>
            </div>
          </motion.div>
          
          {/* Scroll Indicator */}
          <motion.div 
            animate={{ y: [0, 12, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4"
          >
            <span className="text-[8px] uppercase tracking-[0.4em] text-primary/40 font-bold">Scroll</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-primary/60 to-transparent" />
          </motion.div>
        </div>

        {/* Foreground Depth Elements (Blurry dust/particles) */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <motion.div 
            animate={{ 
              x: [0, 50, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 -left-20 w-40 h-40 bg-white/5 rounded-full blur-[60px]" 
          />
          <motion.div 
            animate={{ 
              x: [0, -50, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 25, repeat: Infinity }}
            className="absolute bottom-1/4 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-[80px]" 
          />
        </div>
      </section>

      {/* About Section */}
      <motion.section 
        id="about" 
        className="py-20 sm:py-32 border-y border-white/5"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h6 className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">The Visionary</h6>
              <h3 className="text-4xl sm:text-5xl font-display font-bold mb-8 sm:mb-10 leading-tight">Crafting Digital <br/>Excellence in Harare</h3>
              
              {isEditingProfile ? (
                <div className="space-y-6 mb-10">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Age</label>
                    <input 
                      type="number" 
                      value={editAge}
                      onChange={(e) => setEditAge(parseInt(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Biography</label>
                    <textarea 
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={5}
                      className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={isProfileUploading}
                      className="bg-primary text-black px-6 py-2 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {isProfileUploading ? "Saving..." : "Save Changes"}
                    </button>
                    <button 
                      onClick={() => setIsEditingProfile(false)}
                      className="bg-white/10 text-white px-6 py-2 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-base sm:text-lg text-slate-400 mb-6 sm:mb-8 leading-relaxed">
                    I am a {profileAge}-year-old creative professional with over 7 years of experience in Graphic Design, Web Development, Digital Advertising, and AI-driven solutions. {profileBio}
                  </p>
                  {isAdmin && (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="mb-8 text-primary text-[10px] uppercase tracking-widest font-bold flex items-center space-x-2 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Profile Info</span>
                    </button>
                  )}
                </>
              )}
              
              <p className="text-base sm:text-lg text-slate-400 mb-10 sm:mb-12 leading-relaxed">
                My approach combines technical precision with artistic intuition, delivering results that don't just look good—they perform.
              </p>
              
              <div className="grid grid-cols-2 gap-6 sm:gap-8 mb-12">
                <div className="space-y-2">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-primary">07+</div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-500 font-bold">Years Experience</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-primary">150+</div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-500 font-bold">Projects Delivered</div>
                </div>
              </div>

              <div className="flex space-x-6">
                <a href="#" className="text-slate-500 hover:text-primary transition-colors"><Github className="w-5 h-5" /></a>
                <a href="#" className="text-slate-500 hover:text-primary transition-colors"><Linkedin className="w-5 h-5" /></a>
                <a href="#" className="text-slate-500 hover:text-primary transition-colors"><Mail className="w-5 h-5" /></a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative mt-12 lg:mt-0"
            >
              <div className="aspect-[4/5] rounded-sm overflow-hidden border border-primary/20 p-1 sm:p-2 bg-black/40 relative group">
                {/* Subtle Inner Glow */}
                <div className="absolute inset-0 z-10 pointer-events-none border border-white/5" />
                
                <img 
                  src={profileImage || "https://images.unsplash.com/photo-1531384441138-2736e62e0919?q=80&w=1000&auto=format&fit=crop"} 
                  alt="Sasha Serima" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* Admin Controls */}
                {isAdmin && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/40">
                    <div className="flex flex-col items-center space-y-4">
                      <label className="cursor-pointer bg-primary text-black px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-white transition-colors">
                        <Camera className="w-4 h-4" />
                        <span>{isProfileUploading ? "Uploading..." : "Change Photo"}</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleProfileImageUpload}
                          disabled={isProfileUploading}
                        />
                      </label>
                      {profileImage && (
                        <button 
                          onClick={handleProfileImageDelete}
                          className="bg-red-500/80 text-white px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Progress Overlay */}
                {isProfileUploading && (
                  <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        className="bg-primary h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">{uploadStatus}</p>
                  </div>
                )}
              </div>
              <div className="absolute -top-6 -right-6 sm:-top-10 sm:-right-10 w-24 h-24 sm:w-40 sm:h-40 border-t border-r border-primary/40" />
              <div className="absolute -bottom-6 -left-6 sm:-bottom-10 sm:-left-10 w-24 h-24 sm:w-40 sm:h-40 border-b border-l border-primary/40" />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Skills Section */}
      <motion.section 
        id="skills" 
        className="py-20 sm:py-32 bg-black/20"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 sm:24 gap-8">
            <div className="max-w-xl">
              <h6 className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">Expertise</h6>
              <h3 className="text-4xl sm:text-5xl font-display font-bold">A Multidisciplinary <br/>Skill Set</h3>
            </div>
            <p className="text-slate-500 max-w-sm md:text-right font-light italic">
              "Mastery is not a destination, but a continuous journey of refinement."
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 border border-white/5">
            {SKILLS.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 sm:p-12 bg-slate-950 hover:bg-black/40 transition-colors group"
              >
                <div className="text-primary mb-8 group-hover:scale-110 transition-transform origin-left">
                  {skill.icon}
                </div>
                <h4 className="text-2xl font-display font-bold mb-4">{skill.name}</h4>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                  Expert use of {skill.tools} to deliver high-end commercial results.
                </p>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-slate-500">Proficiency</span>
                  <span className="text-primary">{skill.level}%</span>
                </div>
                <div className="mt-4 h-[1px] bg-white/10 w-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.level}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-primary"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Portfolio Section */}
      <motion.section 
        id="portfolio" 
        className="py-20 sm:py-32 border-b border-white/5"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 sm:mb-24">
            <h6 className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">Curated Work</h6>
            <h3 className="text-4xl sm:text-5xl font-display font-bold mb-10 sm:mb-12">The Portfolio</h3>
            
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {PORTFOLIO_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 sm:px-8 py-2 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all border ${
                    activeCategory === cat 
                    ? "bg-primary text-black border-primary" 
                    : "border-white/10 text-slate-500 hover:border-primary/50 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isAdmin && (
              <div className="mt-12">
                {!showUploadForm ? (
                  <button 
                    onClick={() => setShowUploadForm(true)}
                    className="flex items-center space-x-2 mx-auto px-6 py-3 border border-primary text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Project</span>
                  </button>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleUpload}
                    className="max-w-2xl mx-auto p-8 border border-white/10 bg-white/5 rounded-sm text-left"
                  >
                    <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-sm space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1">Admin Session Info</p>
                      <p className="text-xs text-slate-300">User: <span className="text-white font-mono">{user?.email || "Not logged in"}</span></p>
                      <p className="text-xs text-slate-300">Admin Status: <span className={isAdmin ? "text-green-500" : "text-red-500"}>{isAdmin ? "Verified" : "Not Admin"}</span></p>
                      <p className="text-xs text-slate-300">Storage Bucket: <span className="text-white font-mono">{`gs://${firebaseConfig.storageBucket}`}</span></p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Project Title</label>
                        <input 
                          required
                          type="text"
                          value={newProject.title}
                          onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
                          placeholder="Enter project title"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Category</label>
                        <select 
                          value={newProject.category}
                          onChange={(e) => setNewProject({...newProject, category: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm focus:border-primary outline-none transition-colors appearance-none"
                        >
                          {PORTFOLIO_CATEGORIES.filter(c => c !== "All").map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                          {newProject.category === "Web Development" ? "Website URL" : "External Link / Video URL (YouTube/Facebook)"}
                        </label>
                        <input 
                          type="url"
                          value={newProject.link}
                          onChange={(e) => setNewProject({...newProject, link: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
                          placeholder={newProject.category === "Web Development" ? "https://your-website.com" : "https://youtube.com/watch?v=... or https://facebook.com/..."}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                          Project Image {newProject.category === "Web Development" && "(Optional - Auto-generated from URL if skipped)"}
                        </label>
                        <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-sm p-8 transition-all text-center ${
                            dragActive 
                            ? "border-primary bg-primary/5" 
                            : "border-white/10 bg-black/20 hover:border-white/20"
                          }`}
                        >
                          <input 
                            required={!newProject.file}
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewProject({...newProject, file: e.target.files?.[0] || null})}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          
                          <div className="flex flex-col items-center space-y-4">
                            {newProject.file ? (
                              <div className={`relative w-32 ${newProject.category === "Graphic Design" ? "aspect-[1/1.414]" : "aspect-square"} rounded-sm overflow-hidden border border-white/10`}>
                                <img 
                                  src={URL.createObjectURL(newProject.file)} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <CheckCircle2 className="w-8 h-8 text-primary" />
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-white/5 rounded-full">
                                <Upload className="w-8 h-8 text-slate-500" />
                              </div>
                            )}
                            
                            <div>
                              <p className="text-sm font-bold text-slate-200">
                                {newProject.file ? newProject.file.name : "Click or drag image to upload"}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                            </div>
                          </div>
                        </div>
                        
                        {isUploading && (
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                              <span className="text-slate-500">{uploadStatus}</span>
                              <span className="text-primary">{uploadProgress}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                className="h-full bg-primary"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-8">
                      <button 
                        type="button"
                        onClick={async () => {
                          console.log("Manual connection test triggered");
                          await testConnection();
                          await testStorageConnection();
                          alert("Connection test triggered. Check browser console for results.");
                        }}
                        className="text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-primary transition-colors"
                      >
                        Check Connection
                      </button>
                      <div className="flex space-x-4">
                        <button 
                          type="button"
                          onClick={() => setShowUploadForm(false)}
                          className="px-6 py-2 text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          disabled={isUploading}
                          type="submit"
                          className="flex items-center space-x-2 px-8 py-3 bg-primary text-black text-[10px] uppercase tracking-widest font-bold hover:bg-gold-light transition-colors disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Starting...'}</span>
                            </>
                          ) : (
                            <span>Publish Project</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </div>
            )}
          </div>

          <motion.div 
            layout
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12"
          >
            <AnimatePresence mode="popLayout">
              {filteredPortfolio.length > 0 ? (
                filteredPortfolio.map((item) => (
                  <motion.div
                    key={item.id || item.title}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group relative"
                  >
                    <div className={`${activeCategory === "Graphic Design" ? "aspect-[1/1.414]" : "aspect-square"} overflow-hidden bg-slate-900 mb-6 relative`}>
                      {item.link && getVideoEmbedUrl(item.link) ? (
                        <iframe
                          src={getVideoEmbedUrl(item.link)!}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={item.title}
                        />
                      ) : (
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      )}
                      {isAdmin && (
                        <div className="absolute top-4 right-4 z-20">
                          {deletingId === item.id ? (
                            <div className="flex flex-col items-end space-y-2">
                              <div className="bg-black/90 p-3 rounded-sm border border-red-500/50 shadow-2xl backdrop-blur-md">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white mb-3">Confirm Delete?</p>
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingId(null);
                                    }}
                                    className="px-3 py-1 bg-slate-800 text-white text-[8px] uppercase font-bold hover:bg-slate-700 transition-colors"
                                  >
                                    No
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      item.id && handleDelete(item.id);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white text-[8px] uppercase font-bold hover:bg-red-500 transition-colors"
                                  >
                                    Yes
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                item.id && setDeletingId(item.id);
                              }}
                              className="p-2 bg-black/80 text-red-500 hover:bg-red-500 hover:text-white rounded-sm transition-all shadow-lg border border-white/10"
                              title="Delete Project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 block">{item.category}</span>
                        <h4 className="text-xl font-display font-bold">{item.title}</h4>
                      </div>
                      {item.link ? (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 border border-white/10 hover:border-primary transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-primary" />
                        </a>
                      ) : (
                        <button className="p-2 border border-white/10 hover:border-primary transition-colors">
                          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-primary" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center border border-white/5 bg-white/5 rounded-sm"
                >
                  <p className="text-slate-500 font-light italic">No projects added yet. Stay tuned!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.section>

      {/* Experience Section */}
      <motion.section 
        id="experience" 
        className="py-20 sm:py-32 bg-black/10"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 sm:mb-24">
            <h6 className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">Career Path</h6>
            <h3 className="text-4xl sm:text-5xl font-display font-bold">Professional History</h3>
          </div>

          <div className="space-y-16 sm:space-y-24">
            {EXPERIENCE.map((exp, index) => (
              <motion.div
                key={exp.company}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="grid lg:grid-cols-[200px_1fr] gap-8 lg:gap-12"
              >
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 lg:pt-2">
                  {exp.period}
                </div>
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                    <div>
                      <h4 className="text-2xl sm:text-3xl font-display font-bold mb-2">{exp.role}</h4>
                      <p className="text-primary text-sm font-bold uppercase tracking-widest">{exp.company}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                    <ul className="space-y-4">
                      {exp.description.slice(0, 4).map((item, i) => (
                        <li key={i} className="flex items-start space-x-3 text-sm text-slate-400 leading-relaxed">
                          <div className="mt-2 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-4">
                      {exp.description.slice(4).map((item, i) => (
                        <li key={i} className="flex items-start space-x-3 text-sm text-slate-400 leading-relaxed">
                          <div className="mt-2 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-32 text-center">
            <a 
              href="/Sasha_Serima_CV.pdf" 
              download="Sasha_Serima_CV.pdf"
              className="px-12 py-5 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-primary transition-colors flex items-center space-x-3 mx-auto w-fit"
            >
              <Download className="w-4 h-4" />
              <span>Download Curriculum Vitae</span>
            </a>
          </div>
        </div>
      </motion.section>

      {/* Contact Section */}
      <motion.section 
        id="contact" 
        className="py-20 sm:py-32 bg-slate-950 border-t border-white/5"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16 lg:gap-24">
            <div>
              <h6 className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">Contact</h6>
              <h3 className="text-4xl sm:text-6xl font-display font-bold mb-8 sm:mb-12 tracking-tighter">Let's Discuss <br/>Your Project</h3>
              
              <div className="space-y-8 sm:space-y-12">
                <div className="group">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-2 sm:mb-4">Direct Email</p>
                  <a href="mailto:sashaserima@gmail.com" className="text-xl sm:text-2xl font-display hover:text-primary transition-colors break-all">sashaserima@gmail.com</a>
                </div>
                <div className="group">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-2 sm:mb-4">Phone Line</p>
                  <a href="tel:0785193285" className="text-xl sm:text-2xl font-display hover:text-primary transition-colors">0785193285</a>
                </div>
                <div className="group">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-2 sm:mb-4">Studio Location</p>
                  <p className="text-xl sm:text-2xl font-display">Harare, Zimbabwe</p>
                </div>
              </div>
            </div>

            <div className="bg-black/40 p-6 sm:p-12 border border-white/5">
              <form className="space-y-8 sm:space-y-10">
                <div className="grid sm:grid-cols-2 gap-8 sm:gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Full Name</label>
                    <input type="text" className="w-full bg-transparent border-b border-white/10 py-4 focus:border-primary outline-none transition-colors text-lg" placeholder="John Doe" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                    <input type="email" className="w-full bg-transparent border-b border-white/10 py-4 focus:border-primary outline-none transition-colors text-lg" placeholder="john@example.com" />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Project Type</label>
                  <input type="text" className="w-full bg-transparent border-b border-white/10 py-4 focus:border-primary outline-none transition-colors text-lg" placeholder="Web Development / Branding" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Message</label>
                  <textarea rows={4} className="w-full bg-transparent border-b border-white/10 py-4 focus:border-primary outline-none transition-colors text-lg resize-none" placeholder="Describe your vision..."></textarea>
                </div>
                <button className="px-12 py-5 bg-primary text-black font-bold uppercase tracking-widest text-sm hover:bg-gold-light transition-all w-full md:w-auto">
                  Send Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-16 sm:py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-12 mb-16 sm:mb-20">
            <div className="text-2xl sm:text-3xl font-display font-bold tracking-tighter">
              SASHA<span className="text-primary">SERIMA</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 lg:gap-12">
              {["About", "Skills", "Portfolio", "Experience", "Contact"].map((item) => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase()}`}
                  className="text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-primary transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
            <div className="flex space-x-6">
              <a href="#" className="p-3 border border-white/10 rounded-full hover:border-primary hover:text-primary transition-all"><Github className="w-4 h-4" /></a>
              <a href="#" className="p-3 border border-white/10 rounded-full hover:border-primary hover:text-primary transition-all"><Linkedin className="w-4 h-4" /></a>
              <a href="#" className="p-3 border border-white/10 rounded-full hover:border-primary hover:text-primary transition-all"><Mail className="w-4 h-4" /></a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 gap-6 text-center md:text-left">
            <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold">
              © {new Date().getFullYear()} Sasha Serima. All rights reserved.
            </p>
            <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold">
              Designed for Excellence
            </p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-4 bg-primary text-black rounded-full shadow-2xl z-50 hover:bg-gold-light transition-all group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
