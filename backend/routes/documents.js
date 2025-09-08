const express = require('express');
const Document = require('../models/Document');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { QuillDeltaToHtmlConverter } = require('quill-delta-to-html');
const { Document: DocxDocument, Packer, Paragraph, TextRun } = require('docx');
const pdf = require('html-pdf');
const { JSDOM } = require('jsdom');

const router = express.Router();

// Function to safely check document access
const checkDocumentAccess = async (documentId, userId) => {
  const document = await Document.findById(documentId)
    .populate('owner', 'id username')
    .populate('collaborators.user', 'id username');

  if (!document) return { hasAccess: false, canEdit: false, document: null };

  const isOwner = document.owner?._id?.toString() === userId.toString();
  const collaborator = document.collaborators?.find(
    c => c.user?._id?.toString() === userId.toString()
  );
  const isEditor = collaborator?.role === 'editor';
  const isViewer = collaborator?.role === 'viewer';
  const isPublic = document.isPublic;

  return {
    hasAccess: isOwner || isEditor || isViewer || isPublic,
    canEdit: isOwner || isEditor,
    document
  };
};

// Get all documents accessible to the user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
        { isPublic: true }
      ]
    }).populate('owner', 'username').populate('collaborators.user', 'username');

    res.json(documents || []);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single document
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { hasAccess, canEdit, document } = await checkDocumentAccess(req.params.id, req.user._id);

    if (!document || !hasAccess) return res.status(404).json({ message: 'Document not found' });

    res.json({
      ...document.toObject(),
      canEdit,
      contentDelta: document.contentDelta || { ops: [] },
      content: document.content || ''
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new document
router.post('/', authenticateToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { title, content, contentDelta, isPublic } = req.body;

    const document = new Document({
      title,
      content: content || '',
      contentDelta: contentDelta || { ops: [] },
      owner: req.user._id,
      isPublic
    });

    await document.save();
    await document.populate('owner', 'username');

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update document
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { content, contentDelta, title } = req.body;
    const { hasAccess, canEdit, document } = await checkDocumentAccess(req.params.id, req.user._id);

    if (!document || !hasAccess || !canEdit) return res.status(404).json({ message: 'Document not found or insufficient permissions' });

    document.versions.push({
      delta: document.contentDelta || null,
      html: document.content || '',
      editedBy: req.user._id,
      timestamp: new Date()
    });

    if (title) document.title = title;

    if (contentDelta) {
      document.contentDelta = contentDelta;
      try {
        const converter = new QuillDeltaToHtmlConverter(contentDelta.ops || [], {});
        document.content = converter.convert();
      } catch (err) {
        console.warn('Delta->HTML conversion failed', err);
      }
    } else if (typeof content === 'string') {
      document.content = content;
    }

    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add collaborator
router.post('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const document = await Document.findOne({ _id: req.params.id, owner: req.user._id });

    if (!document) return res.status(404).json({ message: 'Document not found or insufficient permissions' });

    const existingCollaborator = document.collaborators?.find(c => c.user?.toString() === userId);
    if (existingCollaborator) existingCollaborator.role = role;
    else document.collaborators.push({ user: userId, role });

    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:userId', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user._id });
    if (!document) return res.status(404).json({ message: 'Document not found or insufficient permissions' });

    document.collaborators = document.collaborators?.filter(c => c.user?.toString() !== req.params.userId);
    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete document (Owner or Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const userId = req.user.id;

    // Allow delete if current user is document owner or admin
    const isOwner = doc.owner.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Cannot delete this document' });
    }

    await doc.deleteOne(); // Delete document
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export document as PDF or Word
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const { format } = req.query;
    const { hasAccess, document } = await checkDocumentAccess(req.params.id, req.user._id);

    if (!document || !hasAccess) return res.status(404).json({ message: 'Document not found' });

    const html = document.content || '';

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.title}.pdf"`);
      pdf.create(html).toStream((err, stream) => {
        if (err) return res.status(500).send('PDF generation error');
        stream.pipe(res);
      });
    } else if (format === 'word') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${document.title}.docx"`);

      // Convert HTML to basic Word paragraphs preserving bold/italic/underline
      const dom = new JSDOM(html);
      const paragraphs = Array.from(dom.window.document.body.children).map(node => {
        const runs = [];

        node.childNodes.forEach(n => {
          if (n.nodeType === 3) runs.push(new TextRun({ text: n.textContent }));
          else if (n.nodeType === 1) {
            const style = {};
            if (n.tagName === 'B' || n.tagName === 'STRONG') style.bold = true;
            if (n.tagName === 'I' || n.tagName === 'EM') style.italics = true;
            if (n.tagName === 'U') style.underline = {};
            runs.push(new TextRun({ text: n.textContent, ...style }));
          }
        });

        return new Paragraph({ children: runs.length ? runs : [new TextRun({ text: node.textContent })] });
      });

      const doc = new DocxDocument({
        sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph('')] }]
      });

      const buffer = await Packer.toBuffer(doc);
      res.send(buffer);
    } else {
      res.status(400).json({ message: 'Unsupported format' });
    }
  } catch (error) {
    console.error('Error exporting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
