/**
 * Knowledge Base Library
 * Persistent storage and retrieval for research reports and findings
 * Uses localStorage for browser environment and file system for Node.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class KnowledgeBase {
  constructor(storagePath = './research-reports') {
    this.storagePath = storagePath;
    this.ensureStorageDirectory();
    this.indexPath = path.join(this.storagePath, 'index.json');
    this.index = this.loadIndex();
  }

  /**
   * Ensure storage directory exists
   */
  ensureStorageDirectory() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Load the research index
   * @returns {Object} Index object
   */
  loadIndex() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const indexData = fs.readFileSync(this.indexPath, 'utf8');
        return JSON.parse(indexData);
      }
    } catch (error) {
      console.error(`Error loading index: ${error.message}`);
    }
    return {
      reports: {},
      tags: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save the research index
   */
  saveIndex() {
    try {
      this.index.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
    } catch (error) {
      console.error(`Error saving index: ${error.message}`);
    }
  }

  /**
   * Generate unique ID for research item
   * @param {string} topic - Research topic
   * @returns {string} Unique ID
   */
  generateId(topic) {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(topic + timestamp).digest('hex').substring(0, 8);
    return `${timestamp}-${hash}`;
  }

  /**
   * Save research report to knowledge base
   * @param {Object} research - Research object
   * @returns {Object} Saved research with ID
   */
  save(research) {
    try {
      const id = this.generateId(research.topic);
      const researchItem = {
        id,
        ...research,
        created: new Date().toISOString(),
      };

      // Save to file
      const filename = `${id}.json`;
      const filepath = path.join(this.storagePath, filename);
      fs.writeFileSync(filepath, JSON.stringify(researchItem, null, 2));

      // Update index
      this.index.reports[id] = {
        id,
        topic: research.topic,
        type: research.type || 'research-report',
        timestamp: researchItem.created,
        tags: research.tags || [],
        filename,
      };

      // Update tag index
      if (research.tags) {
        research.tags.forEach(tag => {
          if (!this.index.tags[tag]) {
            this.index.tags[tag] = [];
          }
          if (!this.index.tags[tag].includes(id)) {
            this.index.tags[tag].push(id);
          }
        });
      }

      this.saveIndex();

      console.log(`Knowledge Base: Saved research "${research.topic}" with ID ${id}`);
      return researchItem;
    } catch (error) {
      console.error(`Error saving research: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search knowledge base by query
   * @param {string} query - Search query
   * @returns {Array} Matching research items
   */
  search(query) {
    try {
      const results = [];
      const queryLower = query.toLowerCase();

      // Search through all reports
      for (const [id, report] of Object.entries(this.index.reports)) {
        // Check topic
        if (report.topic.toLowerCase().includes(queryLower)) {
          results.push(this.getById(id));
          continue;
        }

        // Check tags
        if (report.tags && report.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
          results.push(this.getById(id));
          continue;
        }

        // Check type
        if (report.type && report.type.toLowerCase().includes(queryLower)) {
          results.push(this.getById(id));
        }
      }

      // Sort by most recent first
      results.sort((a, b) => new Date(b.created) - new Date(a.created));

      return results;
    } catch (error) {
      console.error(`Error searching: ${error.message}`);
      return [];
    }
  }

  /**
   * Get research by ID
   * @param {string} id - Research ID
   * @returns {Object|null} Research object or null
   */
  getById(id) {
    try {
      const reportMeta = this.index.reports[id];
      if (!reportMeta) {
        return null;
      }

      const filepath = path.join(this.storagePath, reportMeta.filename);
      if (!fs.existsSync(filepath)) {
        return null;
      }

      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error getting research by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all research on a specific topic
   * @param {string} topic - Research topic
   * @returns {Array} Matching research items (most recent first)
   */
  getByTopic(topic) {
    try {
      const results = [];
      const topicLower = topic.toLowerCase();

      for (const [id, report] of Object.entries(this.index.reports)) {
        if (report.topic.toLowerCase() === topicLower) {
          results.push(this.getById(id));
        }
      }

      // Sort by most recent first
      results.sort((a, b) => new Date(b.created) - new Date(a.created));

      return results;
    } catch (error) {
      console.error(`Error getting by topic: ${error.message}`);
      return [];
    }
  }

  /**
   * Get research by tag
   * @param {string} tag - Tag to search for
   * @returns {Array} Research items with this tag
   */
  getByTag(tag) {
    try {
      const tagLower = tag.toLowerCase();
      const ids = this.index.tags[tagLower] || [];

      const results = ids
        .map(id => this.getById(id))
        .filter(item => item !== null);

      // Sort by most recent first
      results.sort((a, b) => new Date(b.created) - new Date(a.created));

      return results;
    } catch (error) {
      console.error(`Error getting by tag: ${error.message}`);
      return [];
    }
  }

  /**
   * Get research by type
   * @param {string} type - Research type (research-report, competitor-analysis, best-practices)
   * @returns {Array} Research items of this type
   */
  getByType(type) {
    try {
      const results = [];
      const typeLower = type.toLowerCase();

      for (const [id, report] of Object.entries(this.index.reports)) {
        if (report.type && report.type.toLowerCase() === typeLower) {
          results.push(this.getById(id));
        }
      }

      // Sort by most recent first
      results.sort((a, b) => new Date(b.created) - new Date(a.created));

      return results;
    } catch (error) {
      console.error(`Error getting by type: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all research items
   * @param {number} limit - Maximum number of items to return
   * @returns {Array} All research items (most recent first)
   */
  getAll(limit = 100) {
    try {
      const results = Object.keys(this.index.reports)
        .map(id => this.getById(id))
        .filter(item => item !== null);

      // Sort by most recent first
      results.sort((a, b) => new Date(b.created) - new Date(a.created));

      return results.slice(0, limit);
    } catch (error) {
      console.error(`Error getting all research: ${error.message}`);
      return [];
    }
  }

  /**
   * Get statistics about the knowledge base
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      total_reports: Object.keys(this.index.reports).length,
      total_tags: Object.keys(this.index.tags).length,
      types: this.getTypeBreakdown(),
      last_updated: this.index.lastUpdated,
      storage_path: this.storagePath,
    };
  }

  /**
   * Get breakdown of research types
   * @returns {Object} Type counts
   */
  getTypeBreakdown() {
    const breakdown = {};
    for (const report of Object.values(this.index.reports)) {
      const type = report.type || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    }
    return breakdown;
  }

  /**
   * Delete research by ID
   * @param {string} id - Research ID
   * @returns {boolean} Success status
   */
  delete(id) {
    try {
      const reportMeta = this.index.reports[id];
      if (!reportMeta) {
        return false;
      }

      // Delete file
      const filepath = path.join(this.storagePath, reportMeta.filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      // Remove from tag index
      if (reportMeta.tags) {
        reportMeta.tags.forEach(tag => {
          if (this.index.tags[tag]) {
            this.index.tags[tag] = this.index.tags[tag].filter(tagId => tagId !== id);
            if (this.index.tags[tag].length === 0) {
              delete this.index.tags[tag];
            }
          }
        });
      }

      // Remove from reports index
      delete this.index.reports[id];

      this.saveIndex();

      console.log(`Knowledge Base: Deleted research ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting research: ${error.message}`);
      return false;
    }
  }

  /**
   * Export all research to a single JSON file
   * @param {string} outputPath - Output file path
   * @returns {boolean} Success status
   */
  exportAll(outputPath) {
    try {
      const allResearch = this.getAll(Number.MAX_SAFE_INTEGER);
      const exportData = {
        exported: new Date().toISOString(),
        total_items: allResearch.length,
        stats: this.getStats(),
        research: allResearch,
      };

      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
      console.log(`Knowledge Base: Exported ${allResearch.length} items to ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`Error exporting: ${error.message}`);
      return false;
    }
  }
}

module.exports = KnowledgeBase;
