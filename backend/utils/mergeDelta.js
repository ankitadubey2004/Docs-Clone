// utils/mergeDelta.js
const Version = require('../models/Version');
const OperationalTransform = require('./operationalTransform');

async function mergeDelta(docId, newDelta) {
  try {
    // 1. Get latest version for this document
    const lastVersion = await Version.findOne({ document: docId }).sort({ timestamp: -1 });

    let mergedContent;

    if (!lastVersion) {
      // First version = just save delta
      mergedContent = newDelta;
    } else {
      // Apply OT between last version ops and new incoming ops
      const transformedOps = OperationalTransform.transform(
        newDelta.ops,
        lastVersion.content.ops
      );

      mergedContent = {
        ops: [...lastVersion.content.ops, ...transformedOps],
      };
    }

    // 2. Save new version in DB
    const newVersion = new Version({
      document: docId,
      content: mergedContent,
    });
    await newVersion.save();

    return mergedContent; // Return final state for broadcasting
  } catch (err) {
    console.error('Error in mergeDelta:', err);
    throw err;
  }
}

module.exports = mergeDelta;
