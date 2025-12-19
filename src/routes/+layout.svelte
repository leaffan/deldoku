<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<div class="app">
	<main>
		{@render children()}
	</main>

	<footer>
		<div class="footer-content">
			<p class="footer-title">DEL-Doku</p>
			<div class="footer-links">
				<a href="https://www.leaffan.net/del" target="_blank" rel="noopener noreferrer" class="footer-link">
					DEL-Statistiken
				</a>
				<span class="footer-separator">•</span>
				<a href="mailto:deldoku@leaffan.net" class="footer-link">
					deldoku@leaffan.net
				</a>
				<span class="footer-separator">•</span>
				<a href="https://bsky.app/profile/leaffan.bsky.social" target="_blank" rel="noopener noreferrer" class="footer-link">
					@leaffan.bsky.social
				</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
		background-color: #f8f9fa;
		border-top: 1px solid #e9ecef;
	}

	.footer-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
	}

	.footer-title {
		margin: 0;
		font-weight: 600;
		color: #495057;
	}

	.footer-links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.footer-link {
		color: #3b82f6;
		text-decoration: none;
		transition: color 0.2s;
	}

	.footer-link:hover {
		color: #2563eb;
		text-decoration: underline;
	}

	.footer-separator {
		color: #adb5bd;
	}

	@media (min-width: 480px) {
		footer {
			padding: 16px 0;
		}
	}
</style>
