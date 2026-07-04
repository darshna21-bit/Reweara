import client from './client';

/**
 * Fetches the active catalog of outfits from the backend.
 * 
 * @param {Object} params - Query filters (category, search, minPrice, maxPrice, sortBy)
 * @returns {Promise<Object>} - Resolves to the backend API response payload
 */
export const getOutfits = async (params = {}) => {
  const response = await client.get('/outfits', { params });
  return response.data;
};

/**
 * Fetches detailed metadata for a single outfit by its slug or MongoDB ID.
 * 
 * @param {string} slugOrId - The outfit slug or ObjectID
 * @returns {Promise<Object>} - Resolves to the backend API response payload
 */
export const getOutfitDetails = async (slugOrId) => {
  const response = await client.get(`/outfits/${slugOrId}`);
  return response.data;
};

/**
 * Fetches all outfits (unfiltered, status-unfiltered) for admin management views.
 * 
 * @returns {Promise<Object>} - Resolves to the backend API response payload
 */
export const getAdminOutfits = async () => {
  const response = await client.get('/outfits/admin');
  return response.data;
};

/**
 * Creates a new outfit in the catalog database with media upload.
 * 
 * @param {FormData} formData - The multipart form data object containing files and texts
 * @returns {Promise<Object>} - Resolves to the backend API response payload
 */
export const createOutfit = async (formData) => {
  const response = await client.post('/outfits/admin', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Updates an existing outfit in the catalog database with optional media uploads.
 * 
 * @param {string} id - The MongoDB ObjectID of the outfit
 * @param {FormData} formData - The multipart form data object containing files and texts
 * @returns {Promise<Object>} - Resolves to the backend API response payload
 */
export const updateOutfit = async (id, formData) => {
  const response = await client.patch(`/outfits/admin/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Marks an outfit as inactive (soft-delete) in the catalog database.
 * 
 * @param {string} id - The MongoDB ObjectID of the outfit to deactivate
 * @returns {Promise<Object>} - Resolves to the backend API response payload
 */
export const deleteOutfit = async (id) => {
  const response = await client.delete(`/outfits/admin/${id}`);
  return response.data;
};


