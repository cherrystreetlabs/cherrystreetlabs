/* Cherry Street Labs — Pricing Page JS */

(function() {
  'use strict';

  // ===== FAQ ACCORDION =====
  document.addEventListener('DOMContentLoaded', function() {
    var questions = document.querySelectorAll('.faq-question');
    questions.forEach(function(q) {
      q.addEventListener('click', function() {
        var item = this.parentElement;
        var isOpen = item.classList.contains('open');

        // Close all
        document.querySelectorAll('.faq-item').forEach(function(el) {
          el.classList.remove('open');
        });

        // Toggle clicked
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    });

    // ===== FORM SUBMISSION VIA EMAIL =====
    var form = document.getElementById('projectBriefForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();

        var formData = new FormData(form);
        var projectDesc = formData.get('projectDesc');
        var budgetRange = formData.get('budgetRange');
        var platforms = formData.get('platforms');
        var email = formData.get('email');

        // Build mailto URL
        var subject = encodeURIComponent('Project Inquiry: ' + budgetRange);
        var body = encodeURIComponent(
          'Brief from: ' + email + '\n\n' +
          'Budget Range: ' + budgetRange + '\n' +
          'Platform(s): ' + platforms + '\n\n' +
          'Project Description:\n' + projectDesc
        );

        window.location.href = 'mailto:ciao@cherrystreetlabs.com?subject=' + subject + '&body=' + body;

        // Show success message
        var container = form.parentElement;
        form.style.display = 'none';
        var success = document.createElement('div');
        success.className = 'form-success';
        success.innerHTML = '<h4>Brief submitted \u2713</h4><p>Opening your email client... If it doesn\'t open automatically, email us directly at <a href="mailto:ciao@cherrystreetlabs.com" style="color:#A0001B;">ciao@cherrystreetlabs.com</a></p>';
        container.appendChild(success);
      });
    }

    // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  });
})();
