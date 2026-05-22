/**
 * Result Routes
 * 
 * Operations for quiz results.
 */

const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/results
 * Get all results (admin only)
 */
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const results = db.prepare(`
      SELECT 
        r.*,
        u.name as user_name,
        q.title as quiz_title
      FROM results r
      JOIN users u ON r.user_id = u.id
      JOIN quizzes q ON r.quiz_id = q.id
      ORDER BY r.completed_at DESC
    `).all();

    const formattedResults = results.map(r => ({
      id: r.id,
      userId: r.user_id,
      quizId: r.quiz_id,
      score: r.score,
      totalQuestions: r.total_questions,
      completedAt: r.completed_at,
      userName: r.user_name,
      quizTitle: r.quiz_title
    }));

    res.json({ success: true, data: formattedResults });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch results' });
  }
});

/**
 * GET /api/results/user/:userId
 * Get results for a specific user
 */
router.get('/user/:userId', authenticateToken, (req, res) => {
  try {
    // Users can only see their own results (unless admin)
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const results = db.prepare(`
      SELECT 
        r.*,
        q.title as quiz_title
      FROM results r
      JOIN quizzes q ON r.quiz_id = q.id
      WHERE r.user_id = ?
      ORDER BY r.completed_at DESC
    `).all(req.params.userId);

    const formattedResults = results.map(r => ({
      id: r.id,
      userId: r.user_id,
      quizId: r.quiz_id,
      score: r.score,
      totalQuestions: r.total_questions,
      completedAt: r.completed_at,
      quizTitle: r.quiz_title
    }));

    res.json({ success: true, data: formattedResults });

  } catch (error) {
    console.error('Get user results error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch results' });
  }
});

/**
 * GET /api/results/check/:userId/:quizId
 * Check if user has attempted a quiz
 */
router.get('/check/:userId/:quizId', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(`
      SELECT id FROM results WHERE user_id = ? AND quiz_id = ?
    `).get(req.params.userId, req.params.quizId);

    res.json({ success: true, data: !!result });

  } catch (error) {
    console.error('Check attempt error:', error);
    res.status(500).json({ success: false, error: 'Failed to check attempt' });
  }
});

/**
 * POST /api/results
 * Submit quiz result
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { quizId, answers } = req.body;
    const userId = req.user.id;

    // Check if already attempted
    const existingResult = db.prepare(`
      SELECT id FROM results WHERE user_id = ? AND quiz_id = ?
    `).get(userId, quizId);

    if (existingResult) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already attempted this quiz' 
      });
    }

    // Get questions and calculate score
    const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ?').all(quizId);
    
    let score = 0;
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question && question.correct_option === answer.answer) {
        score++;
      }
    });

    // Save result
    const result = db.prepare(`
      INSERT INTO results (user_id, quiz_id, score, total_questions) 
      VALUES (?, ?, ?, ?)
    `).run(userId, quizId, score, questions.length);

    res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        userId,
        quizId,
        score,
        totalQuestions: questions.length,
        completedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Submit result error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit result' });
  }
});

module.exports = router;
