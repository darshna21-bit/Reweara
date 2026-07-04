import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getOutfitDetails, updateOutfit } from '../../api/outfits';

export default function AdminOutfitEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // 1. Core Fields State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('lehenga');
  const [occasions, setOccasions] = useState([]);
  const [gender, setGender] = useState('female');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('');
  const [embroideryType, setEmbroideryType] = useState('');
  const [styleType, setStyleType] = useState('');
  const [tags, setTags] = useState('');

  // 2. Financials State
  const [rentPrice, setRentPrice] = useState('');
  const [refundableDeposit, setRefundableDeposit] = useState('');
  const [originalMRP, setOriginalMRP] = useState('');
  const [securityPolicyType, setSecurityPolicyType] = useState('standard');

  // 3. Measurements State
  const [bust, setBust] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [length, setLength] = useState('');
  const [shoulder, setShoulder] = useState('');
  const [sleeveLength, setSleeveLength] = useState('');
  const [alterationNotes, setAlterationNotes] = useState('');

  // 4. Media State
  // Existing files from DB
  const [existingThumbnail, setExistingThumbnail] = useState('');
  const [existingImages, setExistingImages] = useState([]);

  // New selected files (files stay null/empty if unchanged)
  const [newThumbnail, setNewThumbnail] = useState(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState(null);
  const [newGalleryImages, setNewGalleryImages] = useState([]);
  const [newGalleryPreviews, setNewGalleryPreviews] = useState([]);

  // 5. Audit & State
  const [condition, setCondition] = useState('new');
  const [status, setStatus] = useState('available');
  const [qualityNotes, setQualityNotes] = useState('');

  // Lists for dropdown options and checkboxes
  const categories = [
    { value: 'lehenga', label: 'Lehenga' },
    { value: 'saree', label: 'Saree' },
    { value: 'gown', label: 'Gown' },
    { value: 'indo-western', label: 'Indo-Western' },
    { value: 'festive-wear', label: 'Festive Wear' },
    { value: 'wedding-guest', label: 'Wedding Guest' },
    { value: 'farewell-wear', label: 'Farewell Wear' }
  ];

  const occasionOptions = [
    { value: 'wedding', label: 'Wedding' },
    { value: 'reception', label: 'Reception' },
    { value: 'haldi', label: 'Haldi' },
    { value: 'mehendi', label: 'Mehendi' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'pre-wedding', label: 'Pre-Wedding' },
    { value: 'sangeet', label: 'Sangeet' },
    { value: 'farewell', label: 'Farewell' },
    { value: 'traditional-day', label: 'Traditional Day' }
  ];

  const genders = [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'unisex', label: 'Unisex' }
  ];

  const securityPolicies = [
    { value: 'standard', label: 'Standard' },
    { value: 'strict', label: 'Strict' },
    { value: 'flexible', label: 'Flexible' }
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'needs-cleaning', label: 'Needs Cleaning' },
    { value: 'damaged', label: 'Damaged' }
  ];

  const statuses = [
    { value: 'available', label: 'Available' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'retired', label: 'Retired' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Fetch existing details on mount
  useEffect(() => {
    const fetchOutfit = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await getOutfitDetails(id);
        if (res && res.success && res.data?.outfit) {
          const outfit = res.data.outfit;
          
          // Populate state values
          setTitle(outfit.title || '');
          setSlug(outfit.slug || '');
          setDescription(outfit.description || '');
          setCategory(outfit.category || 'lehenga');
          setOccasions(outfit.occasions || []);
          setGender(outfit.gender || 'female');
          setBrand(outfit.brand || '');
          setColor(outfit.color || '');
          setFabric(outfit.fabric || '');
          setEmbroideryType(outfit.embroideryType || '');
          setStyleType(outfit.styleType || '');
          setTags(Array.isArray(outfit.tags) ? outfit.tags.join(', ') : '');

          // Financials
          setRentPrice(outfit.rentPrice !== undefined ? String(outfit.rentPrice) : '');
          setRefundableDeposit(outfit.refundableDeposit !== undefined ? String(outfit.refundableDeposit) : '');
          setOriginalMRP(outfit.originalMRP !== undefined ? String(outfit.originalMRP) : '');
          setSecurityPolicyType(outfit.securityPolicyType || 'standard');

          // Measurements
          if (outfit.measurements) {
            setBust(outfit.measurements.bust !== undefined ? String(outfit.measurements.bust) : '');
            setWaist(outfit.measurements.waist !== undefined ? String(outfit.measurements.waist) : '');
            setHips(outfit.measurements.hips !== undefined ? String(outfit.measurements.hips) : '');
            setLength(outfit.measurements.length !== undefined ? String(outfit.measurements.length) : '');
            setShoulder(outfit.measurements.shoulder !== undefined ? String(outfit.measurements.shoulder) : '');
            setSleeveLength(outfit.measurements.sleeveLength !== undefined ? String(outfit.measurements.sleeveLength) : '');
            setAlterationNotes(outfit.measurements.alterationNotes || '');
          }

          // Media
          setExistingThumbnail(outfit.thumbnail || '');
          setExistingImages(outfit.images || []);

          // Audit
          setCondition(outfit.condition || 'new');
          setStatus(outfit.status || 'available');
          setQualityNotes(outfit.qualityNotes || '');
        } else {
          setErrorMessage('Failed to load outfit data. Invalid response.');
        }
      } catch (err) {
        console.error('Error fetching outfit details:', err);
        setErrorMessage(
          err.response?.data?.message || 'Error fetching outfit details from the database.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutfit();
  }, [id]);

  // Handle Occasion Checkbox toggles
  const handleOccasionChange = (val) => {
    if (occasions.includes(val)) {
      setOccasions(occasions.filter((o) => o !== val));
    } else {
      setOccasions([...occasions, val]);
    }
  };

  // Handle Thumbnail File Selection
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewThumbnail(file);
      setNewThumbnailPreview(URL.createObjectURL(file));
      setValidationErrors((prev) => ({ ...prev, thumbnail: null }));
    }
  };

  // Handle Gallery Images File Selection
  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewGalleryImages(files);
      const previews = files.map((file) => URL.createObjectURL(file));
      setNewGalleryPreviews(previews);
      if (files.length >= 2) {
        setValidationErrors((prev) => ({ ...prev, images: null }));
      }
    }
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setValidationErrors({});

    // Client-side validations
    const errors = {};
    if (!title.trim()) errors.title = 'Title is required.';
    if (!description.trim()) errors.description = 'Description is required.';
    if (!color.trim()) errors.color = 'Color is required.';
    if (!fabric.trim()) errors.fabric = 'Fabric is required.';
    if (occasions.length === 0) errors.occasions = 'Select at least one occasion.';
    
    // Financials
    if (!rentPrice) errors.rentPrice = 'Rent fee is required.';
    if (!refundableDeposit) errors.refundableDeposit = 'Refundable deposit is required.';
    if (!originalMRP) errors.originalMRP = 'Original MRP is required.';

    // Measurements
    if (!bust) errors.bust = 'Bust size is required.';
    if (!waist) errors.waist = 'Waist size is required.';
    if (!hips) errors.hips = 'Hips size is required.';
    if (!length) errors.length = 'Length is required.';

    // Media checks: only validate minimum files if new files are selected
    if (newGalleryImages.length > 0 && newGalleryImages.length < 2) {
      errors.images = 'Please select at least 2 gallery images to replace the existing ones.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsSubmitting(false);
      
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorKey);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Build multipart FormData
    const formData = new FormData();
    formData.append('title', title);
    // Note: slug remains read-only on the UI and is not appended for modification

    formData.append('description', description);
    formData.append('category', category);
    formData.append('occasions', occasions.join(',')); // comma-separated strings
    formData.append('gender', gender);
    if (brand) formData.append('brand', brand);
    formData.append('color', color.toLowerCase());
    formData.append('fabric', fabric);
    if (embroideryType) formData.append('embroideryType', embroideryType);
    if (styleType) formData.append('styleType', styleType);
    formData.append('tags', tags); // comma-separated string

    // Numeric casting
    formData.append('rentPrice', Number(rentPrice));
    formData.append('refundableDeposit', Number(refundableDeposit));
    formData.append('originalMRP', Number(originalMRP));
    formData.append('securityPolicyType', securityPolicyType);

    // Nested measurements
    const measurementsObj = {
      bust: Number(bust),
      waist: Number(waist),
      hips: Number(hips),
      length: Number(length)
    };
    if (shoulder) measurementsObj.shoulder = Number(shoulder);
    if (sleeveLength) measurementsObj.sleeveLength = Number(sleeveLength);
    if (alterationNotes) measurementsObj.alterationNotes = alterationNotes;
    
    formData.append('measurements', JSON.stringify(measurementsObj));

    // Audit State
    formData.append('condition', condition);
    formData.append('status', status);
    formData.append('qualityNotes', qualityNotes);

    // Files: ONLY append files if a new file has been explicitly chosen by the admin
    if (newThumbnail) {
      formData.append('thumbnail', newThumbnail);
    }
    if (newGalleryImages.length > 0) {
      newGalleryImages.forEach((imgFile) => {
        formData.append('images', imgFile);
      });
    }

    try {
      await updateOutfit(id, formData);
      navigate('/admin/outfits');
    } catch (err) {
      console.error('Error submitting outfit edits:', err);
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.errors && typeof errorData.errors === 'object') {
          setValidationErrors(errorData.errors);
          setErrorMessage('Validation checks failed. Please inspect input values highlighted below.');
        } else {
          setErrorMessage(errorData.message || 'Server rejected updates.');
        }
      } else {
        setErrorMessage('Failed to connect to backend server. Please verify your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative pb-12 text-brand-espresso">
      
      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-brand-dust/10 pb-5">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-brand-dust font-semibold block mb-0.5">
            Database Operations
          </span>
          <h1 className="text-2xl md:text-3xl font-serif tracking-tight">
            Modify Outfit Details
          </h1>
        </div>
        <Link
          to="/admin/outfits"
          className="text-xs uppercase tracking-wider text-brand-dust hover:text-brand-espresso font-semibold transition-colors duration-200"
        >
          Cancel & Back
        </Link>
      </div>

      {/* Loader for first fetch */}
      {isLoading ? (
        <div className="bg-white rounded-soft border border-brand-dust/10 p-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
          <p className="text-xs text-brand-dust font-light tracking-wider">Retrieving outfit parameters from server...</p>
        </div>
      ) : (
        <>
          {/* Global Error Alert */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-soft text-xs space-y-1">
              <span className="font-bold block">Operation Failure</span>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Form container */}
          <form onSubmit={handleSubmit} className="space-y-8 text-xs">
            
            {/* SECTION 1: Core Garment Description */}
            <section className="bg-white rounded-soft border border-brand-dust/10 p-6 space-y-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold border-b border-brand-cream pb-2">
                1. Core Garment details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Title */}
                <div id="title" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Garment Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Elegant Red Banarasi Lehenga"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.title ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.title && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.title}</span>
                  )}
                </div>

                {/* Slug (Read-only) */}
                <div id="slug" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    SEO URL Slug (Locked)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    disabled
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/40 text-brand-dust cursor-not-allowed focus:outline-none"
                  />
                  <span className="text-[9px] text-brand-dust leading-normal block">
                    URL paths are locked post-creation to guarantee link stability.
                  </span>
                </div>

                {/* Description */}
                <div id="description" className="col-span-1 md:col-span-2 space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe the dress materials, fit details, history, embroidery type..."
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.description ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.description && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.description}</span>
                  )}
                </div>

                {/* Category dropdown */}
                <div id="category" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Gender dropdown */}
                <div id="gender" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Target Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso"
                  >
                    {genders.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div id="color" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. crimson red"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.color ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.color && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.color}</span>
                  )}
                </div>

                {/* Fabric */}
                <div id="fabric" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Fabric *
                  </label>
                  <input
                    type="text"
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    placeholder="e.g. Pure Silk, Georgette, Velvet"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.fabric ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.fabric && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.fabric}</span>
                  )}
                </div>

                {/* Brand */}
                <div id="brand" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Brand / Designer (Optional)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Sabyasachi, Manish Malhotra"
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                </div>

                {/* Embroidery Type */}
                <div id="embroideryType" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Embroidery Type (Optional)
                  </label>
                  <input
                    type="text"
                    value={embroideryType}
                    onChange={(e) => setEmbroideryType(e.target.value)}
                    placeholder="e.g. Zardozi, Chikankari"
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                </div>

                {/* Style Type */}
                <div id="styleType" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Style / Pattern (Optional)
                  </label>
                  <input
                    type="text"
                    value={styleType}
                    onChange={(e) => setStyleType(e.target.value)}
                    placeholder="e.g. Traditional A-Line, Anarkali Flare"
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                </div>

                {/* Tags comma string */}
                <div id="tags" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Search Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. silk, red, embroidery, wedding"
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                  <span className="text-[9px] text-brand-dust block">
                    Type words separated by commas. Extracted to search index automatically.
                  </span>
                </div>

                {/* Occasions Checkboxes */}
                <div id="occasions" className="col-span-1 md:col-span-2 space-y-2">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Ideal Occasions * (Select at least one)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-brand-cream/20 rounded-soft border border-brand-dust/10">
                    {occasionOptions.map((o) => (
                      <label key={o.value} className="flex items-center space-x-2 cursor-pointer font-light">
                        <input
                          type="checkbox"
                          checked={occasions.includes(o.value)}
                          onChange={() => handleOccasionChange(o.value)}
                          className="rounded border-brand-dust/30 text-brand-espresso focus:ring-brand-espresso"
                        />
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                  {validationErrors.occasions && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.occasions}</span>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 2: Financials & Policy */}
            <section className="bg-white rounded-soft border border-brand-dust/10 p-6 space-y-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold border-b border-brand-cream pb-2">
                2. Financials & Security Policy
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Rent Price */}
                <div id="rentPrice" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Rent Price (₹ per day) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rentPrice}
                    onChange={(e) => setRentPrice(e.target.value)}
                    placeholder="1500"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.rentPrice ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.rentPrice && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.rentPrice}</span>
                  )}
                </div>

                {/* Refundable Deposit */}
                <div id="refundableDeposit" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Refundable Deposit (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={refundableDeposit}
                    onChange={(e) => setRefundableDeposit(e.target.value)}
                    placeholder="3000"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.refundableDeposit ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.refundableDeposit && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.refundableDeposit}</span>
                  )}
                </div>

                {/* Original MRP */}
                <div id="originalMRP" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Original Retail Price (MRP in ₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={originalMRP}
                    onChange={(e) => setOriginalMRP(e.target.value)}
                    placeholder="20000"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.originalMRP ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.originalMRP && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.originalMRP}</span>
                  )}
                </div>

                {/* Security Policy Type */}
                <div id="securityPolicyType" className="sm:col-span-3 space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Cancellation & Security Policy Level *
                  </label>
                  <select
                    value={securityPolicyType}
                    onChange={(e) => setSecurityPolicyType(e.target.value)}
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso"
                  >
                    {securityPolicies.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* SECTION 3: Measurements */}
            <section className="bg-white rounded-soft border border-brand-dust/10 p-6 space-y-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold border-b border-brand-cream pb-2">
                3. Detailed Garment Measurements (Inches)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {/* Bust */}
                <div id="bust" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Bust * (20 - 60)
                  </label>
                  <input
                    type="number"
                    value={bust}
                    onChange={(e) => setBust(e.target.value)}
                    placeholder="34"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.bust ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.bust && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.bust}</span>
                  )}
                </div>

                {/* Waist */}
                <div id="waist" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Waist * (15 - 50)
                  </label>
                  <input
                    type="number"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder="28"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.waist ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.waist && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.waist}</span>
                  )}
                </div>

                {/* Hips */}
                <div id="hips" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Hips * (20 - 60)
                  </label>
                  <input
                    type="number"
                    value={hips}
                    onChange={(e) => setHips(e.target.value)}
                    placeholder="38"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.hips ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.hips && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.hips}</span>
                  )}
                </div>

                {/* Length */}
                <div id="length" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Length * (10 - 100)
                  </label>
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="42"
                    className={`w-full p-2.5 border rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso transition-colors ${
                      validationErrors.length ? 'border-rose-400 focus:border-rose-500' : 'border-brand-dust/20'
                    }`}
                  />
                  {validationErrors.length && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.length}</span>
                  )}
                </div>

                {/* Shoulder */}
                <div id="shoulder" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Shoulder (5 - 30)
                  </label>
                  <input
                    type="number"
                    value={shoulder}
                    onChange={(e) => setShoulder(e.target.value)}
                    placeholder="14"
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                </div>

                {/* Sleeve Length */}
                <div id="sleeveLength" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Sleeve Length (0 - 40)
                  </label>
                  <input
                    type="number"
                    value={sleeveLength}
                    onChange={(e) => setSleeveLength(e.target.value)}
                    placeholder="18"
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                </div>

                {/* Alteration Notes */}
                <div id="alterationNotes" className="col-span-2 space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Alteration / Fit Notes
                  </label>
                  <input
                    type="text"
                    value={alterationNotes}
                    onChange={(e) => setAlterationNotes(e.target.value)}
                    placeholder="e.g. 2-inch margin inside for easy alterations."
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* SECTION 4: Media Upload */}
            <section className="bg-white rounded-soft border border-brand-dust/10 p-6 space-y-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold border-b border-brand-cream pb-2">
                4. Image Assets (Cloudinary CDN Pipeline)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Thumbnail Select */}
                <div id="thumbnail" className="space-y-2">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Outfit Thumbnail (Optional replacement)
                  </label>
                  
                  {/* Current Active Thumbnail */}
                  {existingThumbnail && !newThumbnailPreview && (
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-brand-dust block font-medium">Current active thumbnail:</span>
                      <div className="relative w-24 h-24 rounded-md overflow-hidden bg-brand-cream border border-brand-dust/10">
                        <img src={existingThumbnail} alt="Current Active Thumbnail" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  {/* New Selected Preview */}
                  {newThumbnailPreview && (
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-700 block font-medium">New replacement selected:</span>
                      <div className="relative w-24 h-24 rounded-md overflow-hidden bg-brand-cream border border-emerald-300">
                        <img src={newThumbnailPreview} alt="New Thumbnail Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setNewThumbnail(null);
                            setNewThumbnailPreview(null);
                          }}
                          className="absolute top-1 right-1 bg-brand-espresso text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="relative border-2 border-dashed border-brand-dust/25 hover:border-brand-espresso/50 rounded-luxury p-5 text-center transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="text-xl">🖼️</span>
                    <p className="text-[11px] text-brand-dust mt-1 font-light">
                      {newThumbnail ? newThumbnail.name : 'Click to upload replacement thumbnail file'}
                    </p>
                  </div>
                  {validationErrors.thumbnail && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.thumbnail}</span>
                  )}
                </div>

                {/* Gallery Images Select */}
                <div id="images" className="space-y-2">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Product Gallery Images (Optional replacement - min 2)
                  </label>

                  {/* Current Active Gallery Previews */}
                  {existingImages.length > 0 && newGalleryPreviews.length === 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-brand-dust block font-medium">Current active gallery ({existingImages.length} images):</span>
                      <div className="flex gap-2 flex-wrap">
                        {existingImages.map((url, idx) => (
                          <div key={idx} className="w-16 h-16 rounded-md overflow-hidden bg-brand-cream border border-brand-dust/10">
                            <img src={url} alt={`Current Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Selected Gallery Previews */}
                  {newGalleryPreviews.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-700 block font-medium">New replacement gallery selected ({newGalleryPreviews.length} images):</span>
                      <div className="flex gap-2 flex-wrap">
                        {newGalleryPreviews.map((src, idx) => (
                          <div key={idx} className="w-16 h-16 rounded-md overflow-hidden bg-brand-cream border border-emerald-300">
                            <img src={src} alt={`New Gallery Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewGalleryImages([]);
                          setNewGalleryPreviews([]);
                        }}
                        className="text-[9px] text-rose-600 font-bold block hover:underline pt-1"
                      >
                        ✕ Cancel Replacement & Keep Existing
                      </button>
                    </div>
                  )}

                  <div className="relative border-2 border-dashed border-brand-dust/25 hover:border-brand-espresso/50 rounded-luxury p-5 text-center transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="text-xl">📸</span>
                    <p className="text-[11px] text-brand-dust mt-1 font-light">
                      {newGalleryImages.length > 0
                        ? `${newGalleryImages.length} files selected`
                        : 'Click to upload replacement gallery (overwrites all current photos)'}
                    </p>
                  </div>
                  {validationErrors.images && (
                    <span className="text-[10px] text-rose-600 block">{validationErrors.images}</span>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 5: Operational States */}
            <section className="bg-white rounded-soft border border-brand-dust/10 p-6 space-y-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold border-b border-brand-cream pb-2">
                5. Operational State & Conditions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Condition dropdown */}
                <div id="condition" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Garment Condition *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso"
                  >
                    {conditions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status dropdown */}
                <div id="status" className="space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Catalog Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso"
                  >
                    {statuses.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Quality Notes */}
                <div id="qualityNotes" className="sm:col-span-3 space-y-1">
                  <label className="block uppercase tracking-wider font-semibold text-brand-dust">
                    Quality / Audit Notes
                  </label>
                  <input
                    type="text"
                    value={qualityNotes}
                    onChange={(e) => setQualityNotes(e.target.value)}
                    placeholder="e.g. Brand new designer outfit directly from source. No repairs needed."
                    className="w-full p-2.5 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Action triggers */}
            <div className="flex items-center justify-end gap-4 border-t border-brand-cream pt-6">
              <Link
                to="/admin/outfits"
                className="border border-brand-espresso/20 hover:border-brand-espresso text-brand-espresso px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-brand-espresso hover:bg-brand-dust text-brand-cream px-8 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-sm hover:shadow"
              >
                {isSubmitting ? 'Saving Edits...' : 'Save & Update Details'}
              </button>
            </div>
          </form>

          {/* Submission Overlay loader */}
          {isSubmitting && (
            <div className="fixed inset-0 bg-brand-espresso/45 z-[999] flex items-center justify-center flex-col space-y-3">
              <div className="w-10 h-10 border-4 border-brand-blush border-t-brand-cream rounded-full animate-spin"></div>
              <span className="text-white text-xs uppercase tracking-widest font-bold">
                {newThumbnail || newGalleryImages.length > 0
                  ? 'Uploading replacement files to Cloudinary CDN...'
                  : 'Updating database outfit details...'}
              </span>
              <span className="text-brand-cream/80 text-[10px]">Please do not close this tab.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
