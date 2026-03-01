import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <p className="footer-text">&copy; 2024 My Work. All rights reserved.</p>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Terms of Service</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
