// Blog functionality
(function() {
    'use strict';

    // DOM Elements
    const searchInput = document.getElementById('blog-search-input');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const blogGrid = document.getElementById('blog-grid');
    const blogPosts = document.querySelectorAll('.blog-post');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const noResults = document.getElementById('no-results');
    const newsletterForm = document.getElementById('blogNewsletterForm');

    // State
    let currentCategory = 'all';
    let currentSearchTerm = '';
    let visiblePosts = 6;
    let allPosts = Array.from(blogPosts);
    let filteredPosts = [...allPosts];

    // Initialize blog functionality
    function init() {
        setupSearch();
        setupCategoryFilters();
        setupLoadMore();
        setupNewsletterForm();
        setupKeyboardNavigation();
        setupURLParams();
        updateDisplay();
    }

    // Search functionality
    function setupSearch() {
        if (!searchInput) return;

        // Debounced search
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = this.value.toLowerCase().trim();
                filterPosts();
                updateURL();
            }, 300);
        });

        // Search on enter key
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentSearchTerm = this.value.toLowerCase().trim();
                filterPosts();
                updateURL();
            }
        });

        // Clear search on escape
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                currentSearchTerm = '';
                filterPosts();
                updateURL();
            }
        });
    }

    // Category filter functionality
    function setupCategoryFilters() {
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Update active state
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Update current category
                currentCategory = this.getAttribute('data-category');
                
                // Filter posts
                filterPosts();
                updateURL();

                // Announce to screen readers
                announceToScreenReader(`Filtered by ${this.textContent}`);
            });
        });
    }

    // Load more functionality
    function setupLoadMore() {
        if (!loadMoreBtn) return;

        loadMoreBtn.addEventListener('click', function() {
            visiblePosts += 6;
            updateDisplay();
            
            // Focus on first newly visible post for accessibility
            const newlyVisiblePosts = document.querySelectorAll('.blog-post:not(.hidden)');
            if (newlyVisiblePosts[visiblePosts - 6]) {
                newlyVisiblePosts[visiblePosts - 6].focus();
            }
        });
    }

    // Newsletter form
    function setupNewsletterForm() {
        if (!newsletterForm) return;

        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = this.querySelector('input[type="email"]').value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!emailRegex.test(email)) {
                showNotification('Format email tidak valid.', 'error');
                return;
            }

            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Loading...';
            submitBtn.disabled = true;

            // Simulate subscription
            setTimeout(() => {
                showNotification('Terima kasih! Anda telah berlangganan newsletter kami.', 'success');
                this.reset();
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 1500);
        });
    }

    // Keyboard navigation
    function setupKeyboardNavigation() {
        // Allow keyboard navigation for blog posts
        blogPosts.forEach(post => {
            post.setAttribute('tabindex', '0');
            
            post.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const link = this.querySelector('.blog-post-title a');
                    if (link) link.click();
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Escape to clear search
            if (e.key === 'Escape' && document.activeElement === searchInput) {
                clearSearch();
            }
        });
    }

    // URL parameters handling
    function setupURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        const searchParam = urlParams.get('search');

        if (categoryParam && categoryParam !== 'all') {
            currentCategory = categoryParam;
            const categoryBtn = document.querySelector(`[data-category="${categoryParam}"]`);
            if (categoryBtn) {
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                categoryBtn.classList.add('active');
            }
        }

        if (searchParam) {
            currentSearchTerm = searchParam;
            if (searchInput) {
                searchInput.value = searchParam;
            }
        }

        if (categoryParam || searchParam) {
            filterPosts();
        }
    }

    // Filter posts based on category and search
    function filterPosts() {
        filteredPosts = allPosts.filter(post => {
            const category = post.getAttribute('data-category');
            const title = post.querySelector('.blog-post-title').textContent.toLowerCase();
            const excerpt = post.querySelector('.blog-post-excerpt').textContent.toLowerCase();
            const content = title + ' ' + excerpt;

            // Category filter
            const categoryMatch = currentCategory === 'all' || category === currentCategory;
            
            // Search filter
            const searchMatch = !currentSearchTerm || 
                content.includes(currentSearchTerm) ||
                category.includes(currentSearchTerm);

            return categoryMatch && searchMatch;
        });

        // Reset visible posts count
        visiblePosts = 6;
        
        // Update display
        updateDisplay();
        
        // Highlight search terms
        if (currentSearchTerm) {
            highlightSearchTerms();
        } else {
            removeHighlights();
        }

        // Announce results to screen readers
        const resultCount = filteredPosts.length;
        const message = resultCount === 0 
            ? 'Tidak ada artikel ditemukan'
            : `${resultCount} artikel ditemukan`;
        announceToScreenReader(message);
    }

    // Update display based on current filters
    function updateDisplay() {
        // Hide all posts first
        allPosts.forEach(post => {
            post.style.display = 'none';
            post.classList.remove('fade-in', 'fade-out');
        });

        // Show filtered posts with animation
        filteredPosts.slice(0, visiblePosts).forEach((post, index) => {
            post.style.display = 'block';
            setTimeout(() => {
                post.classList.add('fade-in');
            }, index * 50);
        });

        // Update load more button
        if (loadMoreBtn) {
            if (filteredPosts.length > visiblePosts) {
                loadMoreBtn.style.display = 'inline-flex';
                loadMoreBtn.textContent = `Muat ${Math.min(6, filteredPosts.length - visiblePosts)} Artikel Lagi`;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }

        // Show/hide no results message
        if (noResults) {
            if (filteredPosts.length === 0) {
                noResults.style.display = 'block';
                blogGrid.style.display = 'none';
            } else {
                noResults.style.display = 'none';
                blogGrid.style.display = 'grid';
            }
        }
    }

    // Highlight search terms in content
    function highlightSearchTerms() {
        if (!currentSearchTerm) return;

        filteredPosts.forEach(post => {
            const title = post.querySelector('.blog-post-title a');
            const excerpt = post.querySelector('.blog-post-excerpt');

            [title, excerpt].forEach(element => {
                if (element) {
                    const originalText = element.textContent;
                    const regex = new RegExp(`(${escapeRegex(currentSearchTerm)})`, 'gi');
                    const highlightedText = originalText.replace(regex, '<span class="search-highlight">$1</span>');
                    
                    if (highlightedText !== originalText) {
                        element.innerHTML = highlightedText;
                    }
                }
            });
        });
    }

    // Remove search highlights
    function removeHighlights() {
        const highlights = document.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }

    // Update URL with current filters
    function updateURL() {
        const url = new URL(window.location);
        
        if (currentCategory && currentCategory !== 'all') {
            url.searchParams.set('category', currentCategory);
        } else {
            url.searchParams.delete('category');
        }
        
        if (currentSearchTerm) {
            url.searchParams.set('search', currentSearchTerm);
        } else {
            url.searchParams.delete('search');
        }

        // Update URL without page reload
        window.history.replaceState({}, '', url);
    }

    // Clear search and filters
    function clearSearch() {
        if (searchInput) {
            searchInput.value = '';
        }
        currentSearchTerm = '';
        currentCategory = 'all';
        
        // Reset active category button
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        const allButton = document.querySelector('[data-category="all"]');
        if (allButton) {
            allButton.classList.add('active');
        }
        
        filterPosts();
        updateURL();
        removeHighlights();
        
        announceToScreenReader('Pencarian dan filter telah direset');
    }

    // Utility functions
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Close notification">&times;</button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 1060;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    // Infinite scroll (optional enhancement)
    function setupInfiniteScroll() {
        let isLoading = false;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading && filteredPosts.length > visiblePosts) {
                    isLoading = true;
                    
                    // Show loading indicator
                    const loading = document.createElement('div');
                    loading.className = 'loading';
                    loading.textContent = 'Memuat artikel...';
                    blogGrid.appendChild(loading);
                    
                    setTimeout(() => {
                        visiblePosts += 6;
                        updateDisplay();
                        blogGrid.removeChild(loading);
                        isLoading = false;
                    }, 1000);
                }
            });
        }, {
            rootMargin: '100px'
        });

        // Observe the load more button
        if (loadMoreBtn) {
            observer.observe(loadMoreBtn);
        }
    }

    // Reading progress indicator
    function setupReadingProgress() {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
            z-index: 1070;
            transition: width 0.3s ease;
        `;
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            progressBar.style.width = scrollPercent + '%';
        });
    }

    // Analytics tracking
    function trackBlogInteraction(action, category, label) {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: category,
                event_label: label
            });
        }
    }

    // Track search queries
    function trackSearch(query) {
        trackBlogInteraction('search', 'blog', query);
    }

    // Track category filters
    function trackCategoryFilter(category) {
        trackBlogInteraction('filter', 'blog', category);
    }

    // Make clearSearch globally available
    window.clearSearch = clearSearch;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Optional enhancements
    // setupInfiniteScroll();
    // setupReadingProgress();

})();

