const express = require('express');
const authConroller = require('../controllers/auth');

const router = express.Router();

router.post('/signup', authConroller.signup );

router.post('/login', authConroller.login);


router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if(err){
      console.log(ere);
    } else {
      res.redirect('/');
    }
  });
});


module.exports = router;