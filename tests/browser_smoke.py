"""Exercise the complete local user journey in Chromium. Requires Playwright."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = 'http://127.0.0.1:4173'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    response = page.goto(URL)
    assert response.status == 200
    expect(page.locator('#timer')).to_have_text('25:00')
    (ROOT / 'docs/screenshots').mkdir(exist_ok=True)
    page.screenshot(path=str(ROOT / 'docs/screenshots/studio-desktop.png'), full_page=True)

    page.locator('#quick-capture').fill('Sketch a better workday <script>alert(1)</script>')
    page.locator('#quick-capture-form button').click()
    page.locator('[data-view="ideas"]').click()
    expect(page.locator('.idea-card')).to_have_count(1)
    expect(page.locator('.idea-card p')).to_contain_text('<script>alert(1)</script>')
    page.locator('#idea-search').fill('missing')
    expect(page.locator('#ideas-list .empty-state')).to_contain_text('No matching thoughts')
    page.locator('#idea-search').fill('')
    page.get_by_label('Focus on this idea', exact=True).click()
    expect(page.locator('#focus-title')).to_have_value('Sketch a better workday <script>alert(1)</script>')
    page.locator('#focus-title').fill('Build an intentional workspace')
    page.locator('[data-minutes="45"]').click()
    page.locator('#start-focus').click()
    page.wait_for_timeout(1300)
    page.locator('#start-focus').click()
    paused = page.locator('#timer').inner_text()
    page.wait_for_timeout(1100)
    assert page.locator('#timer').inner_text() == paused
    page.locator('#start-focus').click()
    page.reload()
    expect(page.locator('#start-focus')).to_contain_text('Pause focus')
    expect(page.locator('#focus-title')).to_have_attribute('readonly', '')
    page.locator('#finish-focus').click()
    page.locator('#reflection').fill('Made a useful first version.')
    page.locator('#session-next').fill('Review the real workflow.')
    page.locator('#finish-form button[type="submit"]').click()
    page.locator('[data-view="journal"]').click()
    expect(page.locator('#session-count')).to_have_text('1')
    expect(page.locator('.session-row')).to_contain_text('Made a useful first version.')
    expect(page.locator('.session-next')).to_contain_text('Review the real workflow.')
    with page.expect_download() as download_info:
        page.locator('#export-data').click()
    exported = json.loads(Path(download_info.value.path()).read_text())
    assert len(exported['sessions']) == 1 and len(exported['ideas']) == 1

    page.locator('#settings-open').click()
    page.locator('#owner-name').fill('Alex')
    page.locator('#work-mode').select_option('Design')
    page.locator('#motion-setting').check()
    page.locator('#settings-save').click()
    page.locator('[data-view="studio"]').click()
    expect(page.locator('#greeting')).to_have_text('Find your flow, Alex.')
    expect(page.locator('#next-step')).to_have_value('Review the real workflow.')
    page.locator('[data-theme="night"]').click()
    expect(page.locator('body')).to_have_attribute('data-scene', 'night')
    page.reload()
    expect(page.locator('body')).to_have_attribute('data-scene', 'night')
    expect(page.locator('body')).to_have_class('gentle-motion')
    page.locator('#immerse-toggle').click()
    expect(page.locator('body')).to_have_class('gentle-motion immersed')
    assert page.locator('.sidebar').evaluate('(node) => node.inert')
    page.keyboard.press('Escape')
    assert not page.locator('.sidebar').evaluate('(node) => node.inert')
    page.locator('#sound-toggle').click()
    expect(page.locator('#sound-toggle')).to_have_attribute('aria-pressed', 'true')
    page.locator('#sound-toggle').click()
    expect(page.locator('#sound-toggle')).to_have_attribute('aria-pressed', 'false')
    page.locator('#start-focus').focus()
    page.keyboard.press('Meta+j')
    expect(page.locator('#capture-dialog')).to_be_visible()
    page.locator('#idea-text').fill('Keyboard capture works')
    page.locator('#capture-form button[type="submit"]').click()
    page.locator('[data-view="ideas"]').click()
    expect(page.locator('.idea-card')).to_have_count(2)
    page.get_by_label('Mark idea done', exact=True).first.click()
    expect(page.locator('.idea-card.done')).to_have_count(1)
    page.on('dialog', lambda dialog: dialog.accept())
    page.get_by_label('Delete idea', exact=True).first.click()
    expect(page.locator('.idea-card')).to_have_count(1)

    # Recover an expired session exactly once, even when reflection is dismissed.
    page.locator('[data-view="studio"]').click()
    page.add_init_script("""(() => {
      const state = JSON.parse(localStorage.getItem('focus-studio:v1'));
      state.timer = {duration:1500, remaining:1500, endAt:Date.now()+300, phase:'running', title:'Recovered session'};
      localStorage.setItem('focus-studio:v1', JSON.stringify(state));
    })()""")
    page.reload()
    expect(page.locator('#finish-dialog')).to_be_visible()
    page.keyboard.press('Escape')
    page.wait_for_timeout(900)
    expect(page.locator('#finish-dialog')).not_to_be_visible()
    expect(page.locator('#timer')).to_have_text('00:00')
    page.locator('#start-focus').click()
    page.locator('#finish-form button[type="submit"]').click()
    assert len(page.evaluate("JSON.parse(localStorage.getItem('focus-studio:v1')).sessions")) == 2

    # A stale tab is prevented from overwriting a newer tab's data.
    other = context.new_page()
    other.goto(URL)
    other.locator('#next-step').fill('Newer tab value')
    expect(page.locator('#save-status')).to_contain_text('Another tab changed')
    page.locator('#next-step').fill('Stale value')
    assert other.evaluate("JSON.parse(localStorage.getItem('focus-studio:v1')).nextStep") == 'Newer tab value'
    other.close()

    mobile = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    mobile_page = mobile.new_page()
    mobile_page.goto(URL)
    assert mobile_page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile_page.screenshot(path=str(ROOT / 'docs/screenshots/studio-mobile.png'), full_page=True)
    mobile_page.locator('[data-view="ideas"]').click()
    mobile_page.locator('#idea-new').click()
    mobile_page.locator('#idea-text').fill('A mobile thought')
    mobile_page.locator('#capture-form button[type="submit"]').click()
    expect(mobile_page.locator('.idea-card')).to_have_count(1)
    assert mobile_page.evaluate('document.documentElement.scrollWidth <= innerWidth')

    invalid = browser.new_context()
    invalid_page = invalid.new_page()
    invalid_page.goto(URL)
    invalid_page.add_init_script("localStorage.setItem('focus-studio:v1', '{invalid')")
    invalid_page.reload()
    expect(invalid_page.locator('#save-status')).to_contain_text('Temporary')
    invalid_page.locator('#next-step').fill('Temporary notes')
    assert invalid_page.evaluate("localStorage.getItem('focus-studio:v1')") == '{invalid'
    assert not errors, errors
    browser.close()
    print('PASS: desktop and mobile journeys, timer recovery, persistence, capture/search/actions, journal/export, preferences, shortcuts, immersion, sound, stale-tab protection, invalid-data preservation; no JavaScript errors.')
