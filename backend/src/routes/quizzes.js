/**
 * Quiz Routes
 * 
 * CRUD operations for quizzes.
 */

const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/quizzes
 * Get all quizzes with question count
 */
router.get('/', (req, res) => {
  try {
    const quizzes = db.prepare(`
      SELECT 
        q.*,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
      FROM quizzes q
      ORDER BY q.created_at DESC
    `).all();

    const formattedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      duration: quiz.duration,
      createdBy: quiz.created_by,
      createdAt: quiz.created_at,
      questionCount: quiz.question_count
    }));

    res.json({ success: true, data: formattedQuizzes });

  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
  }
});

/**
 * GET /api/quizzes/:id
 * Get quiz by ID
 */
router.get('/:id', (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    res.json({
      success: true,
      data: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        createdBy: quiz.created_by,
        createdAt: quiz.created_at
      }
    });

  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quiz' });
  }
});

/**
 * POST /api/quizzes
 * Create a new quiz (admin only)
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, duration } = req.body;

    // Validation
    if (!title || !description || !duration) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, description, and duration are required' 
      });
    }

    const result = db.prepare(`
      INSERT INTO quizzes (title, description, duration, created_by) 
      VALUES (?, ?, ?, ?)
    `).run(title, description, duration, req.user.id);

    res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        title,
        description,
        duration,
        createdBy: req.user.id,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to create quiz' });
  }
});

/**
 * DELETE /api/quizzes/:id
 * Delete a quiz (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    res.json({ success: true, message: 'Quiz deleted successfully' });

  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete quiz' });
  }
});

module.exports = router;
