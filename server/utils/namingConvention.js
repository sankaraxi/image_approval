/**
 * Image Naming Convention Validator
 * Validates filenames against sector-specific naming patterns
 */

// Mobility Sector Naming Convention
// Format: Part_City_Camera_Date_FrameID.jpg
// Example: MOB_BLR_FC_20260201_F001.jpg
const MOBILITY_PATTERN = /^MOB_[A-Z]{3}_[A-Z]{2,3}_\d{8}_F\d{3,4}\.(jpg|jpeg|png)$/i;

// Retail Sector Naming Convention
// Format: Client_StoreID_Category_Product_Shelf_Angle_Date_Sequence.jpg
// Example: Reliance_STR1023_Beverages_CocaCola_330ml_Shelf2_Front_20260205_01.jpg
const RETAIL_PATTERN = /^[A-Za-z0-9-]+_[A-Z]{3}\d+_[A-Za-z]+_[A-Za-z0-9-]+_Shelf\d+_[A-Za-z]+_\d{8}_\d{2,3}\.(jpg|jpeg|png)$/i;

const CAMERA_POSITIONS = ['FC', 'RC', 'LC', 'RIC'];
const CAPTURE_ANGLES = ['Front', 'Left', 'Right', 'Top'];

/**
 * Validate Mobility sector image filename
 * @param {string} filename 
 * @returns {Object} { isValid: boolean, errors: string[], metadata: Object }
 */
function validateMobilityNaming(filename) {
  const errors = [];
  const metadata = {};

  if (!MOBILITY_PATTERN.test(filename)) {
    // Parse and provide specific errors
    const parts = filename.split('_');
    
    if (parts.length < 5) {
      errors.push('Invalid format. Expected: MOB_CITY_CAMERA_DATE_FRAME.jpg');
      return { isValid: false, errors, metadata };
    }

    // Check Part
    if (parts[0] !== 'MOB') {
      errors.push(`Part must be 'MOB', found '${parts[0]}'`);
    } else {
      metadata.part = parts[0];
    }

    // Check City (3 letter code)
    if (parts[1] && !/^[A-Z]{3}$/i.test(parts[1])) {
      errors.push(`City must be 3-letter code, found '${parts[1]}'`);
    } else {
      metadata.city = parts[1];
    }

    // Check Camera Position
    if (parts[2] && !CAMERA_POSITIONS.includes(parts[2].toUpperCase())) {
      errors.push(`Camera must be one of ${CAMERA_POSITIONS.join(', ')}, found '${parts[2]}'`);
    } else {
      metadata.camera = parts[2];
    }

    // Check Date (YYYYMMDD)
    if (parts[3] && !/^\d{8}$/.test(parts[3])) {
      errors.push(`Date must be YYYYMMDD format, found '${parts[3]}'`);
    } else {
      metadata.date = parts[3];
    }

    // Check Frame ID
    const framePart = parts.slice(4).join('_');
    if (!/^F\d{3,4}\.(jpg|jpeg|png)$/i.test(framePart)) {
      errors.push(`Frame must be F001-F9999 format with .jpg extension, found '${framePart}'`);
    } else {
      metadata.frameId = framePart.split('.')[0];
    }

    return { isValid: errors.length === 0, errors, metadata };
  }

  // Parse metadata for valid filename
  const parts = filename.split('_');
  metadata.part = parts[0];
  metadata.city = parts[1];
  metadata.camera = parts[2];
  metadata.date = parts[3];
  metadata.frameId = parts[4].split('.')[0];

  return { isValid: true, errors: [], metadata };
}

/**
 * Validate Retail sector image filename
 * @param {string} filename 
 * @returns {Object} { isValid: boolean, errors: string[], metadata: Object }
 */
function validateRetailNaming(filename) {
  const errors = [];
  const metadata = {};

  if (!RETAIL_PATTERN.test(filename)) {
    const parts = filename.split('_');
    
    if (parts.length < 8) {
      errors.push('Invalid format. Expected: CLIENT_STOREID_CATEGORY_PRODUCT_SHELF_ANGLE_DATE_SEQ.jpg');
      return { isValid: false, errors, metadata };
    }

    // Check Client name
    if (!parts[0] || parts[0].length < 2) {
      errors.push('Client name is required');
    } else {
      metadata.client = parts[0];
    }

    // Check Store ID
    if (parts[1] && !/^[A-Z]{3}\d+$/i.test(parts[1])) {
      errors.push(`Store ID must be format like STR1023, found '${parts[1]}'`);
    } else {
      metadata.storeId = parts[1];
    }

    // Check Category
    if (!parts[2]) {
      errors.push('Category is required');
    } else {
      metadata.category = parts[2];
    }

    // Check Product
    if (!parts[3]) {
      errors.push('Product name is required');
    } else {
      metadata.product = parts[3];
    }

    // Check Shelf
    if (parts[4] && !/^Shelf\d+$/i.test(parts[4])) {
      errors.push(`Shelf must be format like Shelf1, found '${parts[4]}'`);
    } else {
      metadata.shelf = parts[4];
    }

    // Check Angle
    if (parts[5] && !CAPTURE_ANGLES.includes(parts[5])) {
      errors.push(`Angle must be one of ${CAPTURE_ANGLES.join(', ')}, found '${parts[5]}'`);
    } else {
      metadata.angle = parts[5];
    }

    // Check Date
    if (parts[6] && !/^\d{8}$/.test(parts[6])) {
      errors.push(`Date must be YYYYMMDD format, found '${parts[6]}'`);
    } else {
      metadata.date = parts[6];
    }

    // Check Sequence
    const seqPart = parts.slice(7).join('_');
    if (!/^\d{2,3}\.(jpg|jpeg|png)$/i.test(seqPart)) {
      errors.push(`Sequence must be 01-999 format with .jpg extension, found '${seqPart}'`);
    } else {
      metadata.sequence = seqPart.split('.')[0];
    }

    return { isValid: errors.length === 0, errors, metadata };
  }

  // Parse metadata for valid filename
  const parts = filename.split('_');
  metadata.client = parts[0];
  metadata.storeId = parts[1];
  metadata.category = parts[2];
  metadata.product = parts[3];
  metadata.shelf = parts[4];
  metadata.angle = parts[5];
  metadata.date = parts[6];
  metadata.sequence = parts[7].split('.')[0];

  return { isValid: true, errors: [], metadata };
}

/**
 * Main validator function
 * @param {string} filename 
 * @param {string} mainCategory - 'Mobility' or 'Retail'
 * @returns {Object} validation result
 */
function validateImageNaming(filename, mainCategory) {
  if (!filename) {
    return {
      isValid: false,
      errors: ['Filename is required'],
      metadata: {}
    };
  }

  if (mainCategory === 'Mobility') {
    return validateMobilityNaming(filename);
  } else if (mainCategory === 'Retail') {
    return validateRetailNaming(filename);
  } else {
    return {
      isValid: false,
      errors: [`Unknown category: ${mainCategory}. Must be 'Mobility' or 'Retail'`],
      metadata: {}
    };
  }
}

/**
 * Get naming convention help text
 * @param {string} mainCategory 
 * @returns {Object} format info
 */
function getNamingConventionHelp(mainCategory) {
  const conventions = {
    'Mobility': {
      format: 'MOB_City_Camera_Date_FrameID.jpg',
      example: 'MOB_BLR_FC_20260201_F001.jpg',
      description: 'Mobility sector images',
      fields: [
        { name: 'Part', value: 'MOB', description: 'Project type - always MOB' },
        { name: 'City', value: 'BLR', description: '3-letter city code (e.g., BLR, DEL, MUM)' },
        { name: 'Camera', value: 'FC', description: `Camera position: ${CAMERA_POSITIONS.join(', ')}` },
        { name: 'Date', value: '20260201', description: 'Date in YYYYMMDD format' },
        { name: 'FrameID', value: 'F001', description: 'Frame number F001-F9999' }
      ]
    },
    'Retail': {
      format: 'Client_StoreID_Category_Product_Shelf_Angle_Date_Sequence.jpg',
      example: 'Reliance_STR1023_Beverages_CocaCola_330ml_Shelf2_Front_20260205_01.jpg',
      description: 'Retail sector images',
      fields: [
        { name: 'Client', value: 'Reliance', description: 'Retail brand name' },
        { name: 'StoreID', value: 'STR1023', description: 'Unique store identifier' },
        { name: 'Category', value: 'Beverages', description: 'Product category' },
        { name: 'Product', value: 'CocaCola_330ml', description: 'SKU/Brand/Product name' },
        { name: 'Shelf', value: 'Shelf2', description: 'Shelf number or rack' },
        { name: 'Angle', value: 'Front', description: `Capture angle: ${CAPTURE_ANGLES.join(', ')}` },
        { name: 'Date', value: '20260205', description: 'Date in YYYYMMDD format' },
        { name: 'Sequence', value: '01', description: 'Sequence number 01-99' }
      ]
    }
  };

  return conventions[mainCategory] || null;
}

module.exports = {
  validateImageNaming,
  validateMobilityNaming,
  validateRetailNaming,
  getNamingConventionHelp,
  CAMERA_POSITIONS,
  CAPTURE_ANGLES
};
