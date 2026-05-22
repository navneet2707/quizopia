/**
 * Question Routes
 * 
 * CRUD operations for quiz questions.
 */

const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/questions/:quizId
 * Get all questions for a quiz
 */
router.get('/:quizId', (req, res) => {
  try {
    const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ?')
      .all(req.params.quizId);

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      quizId: q.quiz_id,
      text: q.text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctOption: q.correct_option
    }));

    res.json({ success: true, data: formattedQuestions });

  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

/**
 * POST /api/questions
 * Add a question to a quiz (admin only)
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { quizId, text, optionA, optionB, optionC, optionD, correctOption } = req.body;

    // Validation
    if (!quizId || !text || !optionA || !optionB || !optionC || !optionD || !correctOption) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid correct option' 
      });
    }

    // Check quiz exists
    const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ?').get(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const result = db.prepare(`
      INSERT INTO questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(quizId, text, optionA, optionB, optionC, optionD, correctOption);

    res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        quizId,
        text,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption
      }
    });

  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

/**
 * DELETE /api/questions/:id
 * Delete a question (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    res.json({ success: true, message: 'Question deleted successfully' });

  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
});

module.exports = router;
